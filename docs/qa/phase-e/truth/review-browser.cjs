/* eslint-disable @typescript-eslint/no-require-imports -- Local fixture UI review; every API request intercepted. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { createJiti } = require('jiti')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const jiti = createJiti(__filename, { tryNative: false, fsCache: false })
const { fixtureContaminant, fixtureSample } = jiti(path.resolve('scripts/qa/fixtures.ts'))
const { buildContaminantSummary } = jiti(path.resolve('src/lib/aggregate.ts'))
const { computeSafetyScore } = jiti(path.resolve('src/lib/safety-score.ts'))
const out = __dirname
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const verified = { provenance: 'LAB_REPORTED', verificationStatus: 'VERIFIED', quality: 'verified', source: 'Offline fixture laboratory' }
const c = fixtureContaminant({ id: 'known', name: 'Reviewed example', regulated: true })
const missing = buildContaminantSummary(fixtureContaminant({ id: 'missing', name: 'Missing example' }), [])
const citizen = buildContaminantSummary(fixtureContaminant({ id: 'citizen', name: 'Citizen example' }), [fixtureSample({ provenance: 'CITIZEN_CONTRIBUTED', verificationStatus: 'UNREVIEWED', source: 'Citizen test fixture', quality: 'citizen' })])
const unknown = buildContaminantSummary(fixtureContaminant({ id: 'pfas', slug: 'pfas-fixture', name: 'PFAS benchmark missing', healthGuideline: null, legalLimit: null, regulated: true }), [fixtureSample(verified)])
const known = buildContaminantSummary(c, [fixtureSample({ ...verified, level: .001, unit: 'ppm' })])
const score = computeSafetyScore({ legalExceedances: 0, healthExceedances: 0, totalContaminants: 4, totalSamples: 3, verifiedSamples: 2, citizenSamples: 1, provisionalSamples: 0 })
const utility = { id: 'truth-fixture', pwsid: 'QA-ONLY', name: 'Offline truth fixture', city: 'Fixture town', state: 'IL', population: 0, latitude: 41.88, longitude: -87.63, zipCodes: '00000', county: null, systemType: 'Community', sourceType: 'Surface', treatmentStatus: 'Treated', website: null, notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01', contaminantSummaries: [known, unknown, citizen, missing], totalSamples: 3, exceedances: 0, healthExceedances: 0, safetyScore: { ...score, score: 100 }, dataStatus: { status: 'available', code: null, provenanceAvailable: true } }
const unavailable = { status: 'unavailable', sampleCount: null, eligibleSampleCount: null, healthCompared: null, legalCompared: null, healthAbove: null, legalAbove: null }
const stats = { utilitiesCount: 1, contaminantsCount: 4, samplesCount: 3, reportsCount: 0, volunteersCount: 0, chaptersCount: 0, donationsCount: 0, donationsTotal: 0, statesCovered: 1, populationServed: 0, microplasticsAvg: null, healthExceedances: 0, legalExceedances: 0, trackedByUsCount: 0, qualityCounts: { verified: 2, provisional: 0, citizen: 1 }, mapUtilities: [{ ...utility, assessment: unavailable, contaminantExceedances: { microplastics: false, pfas: false, lead: false, dbp: false } }] }
const report = { createdAt: new Date().toISOString(), source: 'Synthetic local API fixtures, not public utility records. No request is forwarded.', checks: [], success: false }
const save = () => fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2))

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const [width, height] of [[1440,900], [390,844]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' })
      const errors = [], requests = [], writes = []
      await context.addInitScript(() => {
        window.print = () => {}
        window.__truthCardText = []
        const fillText = CanvasRenderingContext2D.prototype.fillText
        CanvasRenderingContext2D.prototype.fillText = function (...args) { if (this.canvas.width === 1200 && this.canvas.height === 630) window.__truthCardText.push(String(args[0])); return fillText.apply(this, args) }
      })
      await context.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url())
        requests.push(url.pathname + url.search)
        if (request.method() !== 'GET') { writes.push(request.method()); await route.abort(); return }
        const fixtures = {
          '/api/stats': url.searchParams.get('view') === 'map' ? { mapUtilities: [{ ...utility, assessment: unavailable }], unmappedCount: 0, assessments: 'not_requested' } : stats,
          '/api/utilities': [utility], '/api/utilities/truth-fixture': utility, '/api/utilities/scores': { scores: [] }, '/api/utilities/recent': { utilities: [] }, '/api/activity': { items: [], counts: { samples: 0, reports: 0, chapters: 0, donations: 0 } }, '/api/readings/recent': { items: [] }, '/api/auth/me': { user: null },
        }
        await route.fulfill({ status: Object.hasOwn(fixtures, url.pathname) ? 200 : 503, contentType: 'application/json', body: JSON.stringify(fixtures[url.pathname] ?? { error: 'Fixture endpoint unavailable' }) })
      })
      await context.route('**/states-10m.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'Topology', objects: { states: { type: 'GeometryCollection', geometries: [] } }, arcs: [] }) }))
      const page = await context.newPage(); page.setDefaultTimeout(20000)
      page.on('pageerror', error => errors.push(error.message))
      try {
        await page.goto(base + '/#map', { waitUntil: 'domcontentloaded' })
        const marker = page.getByTestId('utility-map-marker').first()
        await marker.waitFor()
        assert.equal(await marker.getAttribute('data-assessment'), 'unavailable')
        await marker.focus(); await page.keyboard.press('Enter')
        const dialog = page.getByTestId('utility-detail-dialog')
        await dialog.waitFor(); await dialog.getByTestId('unassessed-score').waitFor()
        const comparisons = dialog.getByTestId('contaminant-comparisons')
        await comparisons.scrollIntoViewIfNeeded()
        assert.match(await comparisons.innerText(), /0.2× benchmark/)
        assert.match(await comparisons.innerText(), /Citizen reading · not assessed/)
        assert.match(await comparisons.innerText(), /No benchmark available/)
        assert.match(await comparisons.innerText(), /Not measured/)
        assert.equal(await comparisons.locator('[class*="emerald"]').count(), 0)
        await page.screenshot({ path: path.join(out, `${width}-detail-comparisons.png`) })
        const popupPromise = page.waitForEvent('popup')
        await dialog.getByRole('button', { name: 'Print report', exact: true }).click()
        const popup = await popupPromise
        assert(popup, 'Print report opens an inspectable document')
        await popup.locator('table').waitFor()
        const printText = await popup.locator('body').innerText()
        assert.match(printText, /Safety score not assessed/)
        assert.doesNotMatch(printText, /Grade A|100\/100|Not regulated|Unregulated/)
        assert.match(printText, /Citizen reading · not assessed/)
        assert.match(printText, /No benchmark available/)
        await popup.screenshot({ path: path.join(out, `${width}-print.png`) })
        await popup.close()
        await dialog.getByRole('button', { name: 'Share community card', exact: true }).click()
        const preview = page.locator('img[alt="Water Report Card for Offline truth fixture"]')
        await preview.waitFor(); await preview.evaluate(image => image.decode())
        const cardText = await page.evaluate(() => window.__truthCardText)
        assert(cardText.includes('0 above / 1 assessed'))
        assert(cardText.includes('3 not assessed'))
        assert(cardText.includes('NO BENCHMARK AVAILABLE'))
        assert(cardText.includes('CITIZEN READING · NOT ASSESSED'))
        assert(!cardText.some(text => /Within guidelines|^Safe$|BELOW BENCHMARK/.test(text)))
        await preview.screenshot({ path: path.join(out, `${width}-share.png`) })
        assert.deepEqual(errors, []); assert.deepEqual(writes, [])
        report.checks.push({ width, height, passed: true, printText, cardText, requests, writes, errors, neutralComparisonAndMap: true })
        console.log('PASS truth UI', width)
      } catch (error) { report.checks.push({ width, height, passed: false, error: error.stack, errors, writes }); console.error('FAIL truth UI', width, error.message); await page.screenshot({ path: path.join(out, `${width}-failure.png`) }).catch(() => {}) }
      finally { await context.close(); save() }
    }
  } finally { await browser.close(); report.success = report.checks.length === 2 && report.checks.every(check => check.passed); report.completedAt = new Date().toISOString(); save() }
  if (!report.success) process.exitCode = 1
})().catch(error => { console.error(error); save(); process.exitCode = 1 })
