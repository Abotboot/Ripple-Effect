/* eslint-disable @typescript-eslint/no-require-imports -- Read-only deployed branch verification. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = 'https://deploy-preview-3--rippleeffecter.netlify.app'
const out = path.resolve('docs/qa/phase-d/preview')
fs.mkdirSync(out, { recursive: true })
const report = { createdAt: new Date().toISOString(), base, applicationRevision: process.env.QA_EXPECTED_COMMIT || null,
  requestPolicy: 'GET only; no database mutation or synthetic response substitution', http: [], checks: [], browser: [], success: false }
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n')
const canonicalIds = rows => rows.map(row => row.id).sort()
const finiteCoords = u => typeof u.latitude === 'number' && Number.isFinite(u.latitude) && Math.abs(u.latitude) <= 90 &&
  typeof u.longitude === 'number' && Number.isFinite(u.longitude) && Math.abs(u.longitude) <= 180
async function get(route) {
  const response = await fetch(base + route, { signal: AbortSignal.timeout(60000), redirect: 'error' })
  const text = await response.text()
  report.http.push({ path: route, method: 'GET', status: response.status, bytes: Buffer.byteLength(text),
    dataStatus: response.headers.get('x-ripple-data-status'), dataCode: response.headers.get('x-ripple-data-code') })
  save()
  assert.equal(response.status, 200, route)
  return JSON.parse(text)
}
async function main() {
  const utilities = await get('/api/export?table=utilities&format=json')
  const locations = await get('/api/stats?view=map')
  const stats = await get('/api/stats')
  const scores = await get('/api/utilities/scores')
  assert(Array.isArray(utilities))
  assert.equal(new Set(canonicalIds(utilities)).size, utilities.length)
  assert.equal(stats.utilitiesCount, utilities.length)
  assert.equal(locations.locationsCount, locations.mapUtilities.length)
  assert.deepEqual(canonicalIds(locations.mapUtilities), canonicalIds(utilities.filter(finiteCoords)))
  assert.equal(locations.unmappedCount, utilities.filter(u => !finiteCoords(u)).length)
  assert.deepEqual(canonicalIds(stats.mapUtilities), canonicalIds(locations.mapUtilities))
  assert.deepEqual(canonicalIds(scores.scores), canonicalIds(utilities))
  const samples = await get('/api/samples?limit=5000')
  const exported = await get('/api/export?table=samples&format=json')
  assert.equal(exported.length, stats.samplesCount)
  assert(stats.samplesCount <= 5000, 'Full API/export reconciliation requires pagination above 5000, not a silent partial check')
  assert.equal(samples.length, stats.samplesCount)
  assert.deepEqual(canonicalIds(samples), canonicalIds(exported))
  const byId = new Map(exported.map(sample => [sample.id, sample]))
  for (const sample of samples) {
    const other = byId.get(sample.id)
    for (const key of ['id', 'utilityId', 'contaminantId', 'level', 'unit', 'sampleDate', 'source', 'quality', 'treatmentStatus']) {
      assert.deepEqual(sample[key], other[key], `Export preserves ${key} for the same observation`)
    }
    assert(!/reporter:[^|]+/i.test(sample.notes || ''), 'Public notes do not expose internal reporter contact')
  }
  const legacy = stats.dataStatus?.code === 'legacy_sample_schema'
  if (legacy) {
    assert.equal(stats.dataStatus.provenanceAvailable, false)
    assert(samples.every(s => s.provenance === 'UNKNOWN' && s.verificationStatus === 'UNREVIEWED'))
    assert(scores.scores.every(s => s.score === null && s.eligibleSampleCount === 0))
    assert(stats.mapUtilities.every(u => u.assessment.status === 'not_assessed' && u.assessment.healthAbove === null && u.assessment.legalAbove === null))
    assert.equal(stats.microplasticsAvg, null)
  }
  report.checks.push({ name: 'Complete public record reconciliation', passed: true, utilities: utilities.length,
    mapLocations: locations.locationsCount, samples: samples.length, sourcesAndUnitsPreserved: true,
    completeIdSetSHA256: crypto.createHash('sha256').update(canonicalIds(samples).join('\n')).digest('hex'),
    legacySchema: legacy, fabricatedSafetyScores: false, qualityCounts: stats.qualityCounts })
  save()
  const withSamples = utilities.filter(u => samples.some(s => s.utilityId === u.id)).slice(0, 2)
  assert.equal(withSamples.length, 2, 'Two stored utilities with samples available for detail/compare checks')
  for (const utility of withSamples) {
    const detail = await get('/api/utilities/' + encodeURIComponent(utility.id))
    assert.equal(detail.totalSamples, samples.filter(s => s.utilityId === utility.id).length)
    if (legacy) { assert.equal(detail.safetyScore.score, null); assert.equal(detail.dataStatus.status, 'degraded') }
  }
  const comparison = await get('/api/utilities/compare?ids=' + withSamples.map(u => encodeURIComponent(u.id)).join(','))
  assert.deepEqual(comparison.utilities.map(u => u.id), withSamples.map(u => u.id))
  assert(comparison.rows.every(row => row.bestUtilityId === null))
  const contaminants = await get('/api/contaminants')
  assert.equal(contaminants.length, stats.contaminantsCount)
  const microplastic = contaminants.find(c => c.slug === 'microplastics')
  if (microplastic) {
    const detail = await get('/api/contaminants/' + encodeURIComponent(microplastic.id))
    assert.equal(detail.totals.samples, samples.filter(s => s.contaminantId === microplastic.id).length)
    if (legacy) { assert.equal(detail.totals.avgTreated, null); assert.equal(detail.totals.avgUntreated, null) }
    await get('/api/microplastics/trend')
  }
  await get('/api/readings/recent')
  await get('/api/activity')
  report.checks.push({ name: 'Detail, compare, contaminant, trend and recent public reads', passed: true })
  save()

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browserVersion = browser.version()
  try {
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500, serviceWorkers: 'block' })
      const page = await context.newPage(), pageErrors = [], consoleErrors = [], failedResponses = [], writes = []
      page.setDefaultTimeout(30000)
      await context.route('**/api/**', route => {
        if (route.request().method() !== 'GET') { writes.push(route.request().method()); return route.abort() }
        return route.continue()
      })
      page.on('pageerror', error => pageErrors.push(error.message))
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      page.on('response', response => { if (response.status() >= 400) failedResponses.push({ path: new URL(response.url()).pathname, status: response.status() }) })
      try {
        await page.goto(base + '/#map', { waitUntil: 'domcontentloaded' })
        await page.getByTestId('utility-map-marker').first().waitFor()
        await page.getByText(`All utilities (${locations.locationsCount})`, { exact: true }).waitFor()
        const markers = await page.getByTestId('utility-map-marker').count()
        assert(markers > 0)
        if (legacy) await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="utility-map-marker"]')].every(e => e.dataset.assessment === 'not_assessed'))
        await page.locator('.rsm-svg').scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(out, `${width}-live-map.png`) })
        await page.getByTestId('utility-map-marker').first().focus()
        await page.keyboard.press('Enter')
        await page.getByRole('dialog').waitFor()
        if (legacy) {
          await page.getByTestId('unassessed-score').waitFor()
          assert.equal(await page.getByRole('dialog').getByText('Not assessed', { exact: true }).count(), 2)
        }
        await page.screenshot({ path: path.join(out, `${width}-live-utility-detail.png`) })
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
        await page.goto(base + '/#about', { waitUntil: 'domcontentloaded' })
        const kenny = page.getByText('Kenny', { exact: true })
        await kenny.waitFor(); await kenny.scrollIntoViewIfNeeded()
        assert.equal(await page.getByText('Aryash', { exact: true }).count(), 0)
        await page.screenshot({ path: path.join(out, `${width}-kenny-finance.png`) })
        await page.goto(base + '/motion-study', { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => document.querySelector('[data-testid="particle-stage"]')?.dataset.renderer === 'interactive-artwork')
        await page.getByTestId('journey-watch').click()
        await page.waitForFunction(() => document.querySelector('video')?.currentTime > 1)
        const source = await page.locator('video').evaluate(v => new URL(v.currentSrc).pathname)
        assert.equal(source, '/media/ripple/microscope/microscope-journey.mp4')
        await page.screenshot({ path: path.join(out, `${width}-new-microscope.png`) })
        await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
        const specimen = page.locator('.specimen-stage')
        await specimen.scrollIntoViewIfNeeded()
        await specimen.getByRole('button', { name: 'UV view', exact: true }).click()
        await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.inspection === '1.000')
        await specimen.getByRole('slider', { name: 'Rotate specimen', exact: true }).fill('35')
        await specimen.screenshot({ path: path.join(out, `${width}-new-uv.png`) })
        await page.getByTestId('study-counter').scrollIntoViewIfNeeded()
        await page.waitForFunction(() => document.querySelector('[data-testid="study-counter"]')?.dataset.value === '240000')
        await page.getByTestId('study-breakdown-toggle').click()
        await page.getByTestId('study-counter').screenshot({ path: path.join(out, `${width}-study-count.png`) })
        assert.equal(await page.locator('iframe[title="Netlify Drawer"]').count(), 0)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
        assert.deepEqual(writes, []); assert.deepEqual(pageErrors, [])
        const apiFailures = failedResponses.filter(r => r.path.startsWith('/api/'))
        assert.deepEqual(apiFailures, [])
        report.browser.push({ width, height, passed: true, markers, kenny: true, newMicroscope: true, specimen: true,
          counter: true, writes, pageErrors, consoleErrors, failedResponses })
        console.log('PASS published', width)
      } catch (error) {
        report.browser.push({ width, height, passed: false, error: error.stack, pageErrors, consoleErrors, failedResponses })
        await page.screenshot({ path: path.join(out, `${width}-failure.png`) }).catch(() => {})
        console.error('FAIL published', width, error.message)
      } finally { await context.close(); save() }
    }
  } finally { await browser.close() }
  report.success = report.browser.length === 2 && report.browser.every(check => check.passed)
  report.completedAt = new Date().toISOString(); save()
  console.log(JSON.stringify({ success: report.success, utilities: utilities.length, samples: samples.length, httpChecks: report.http.length }))
  if (!report.success) process.exitCode = 1
}
main().catch(error => { report.error = error.stack; console.error(error.message); save(); process.exitCode = 1 })
