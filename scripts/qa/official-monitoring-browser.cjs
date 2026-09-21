/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression using the pinned real EPA subset. */
const assert = require('node:assert/strict')
const path = require('node:path')
const snapshot = require('../../src/data/epa-ucmr5.json')
const { getOfficialMonitoring } = require('../../src/lib/epa-data')
const { officialAssessment } = require('../../src/lib/official-monitoring')
const { loadPlaywright } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')
const utilities = ['Chicago', 'Philadelphia'].map((city, index) => {
  const u = snapshot.utilities.find(entry => entry.city === city)
  const identity = { pwsid: u.directoryPwsid, name: u.directoryName, state: u.state }
  const officialMonitoring = getOfficialMonitoring(identity)
  return { ...identity, id: `qa-${city}`, city, pwsid: u.systems[0].pwsid,
    latitude: index ? 39.9526 : 41.8781, longitude: index ? -75.1652 : -87.6298,
    population: 0, sourceType: 'Surface', treatmentStatus: 'Treated', systemType: 'Community',
    officialMonitoring, assessment: officialAssessment(officialMonitoring), contaminantExceedances: { pfas: !!index },
    contaminantSummaries: [], totalSamples: 0, healthExceedances: 0, exceedances: 0, safetyScore: null }
})
const stats = { mapUtilities: utilities, utilitiesCount: 2, contaminantsCount: 2, samplesCount: 0, statesCovered: 2,
  officialMonitoring: { utilities: 2, results: 40, above: 14, sourceUrl: snapshot.sourceUrl }, qualityCounts: {} }
;(async () => {
  for (const [engine, width] of [['chromium', 1440], ['webkit', 414]]) {
    if (process.env.QA_ENGINE && process.env.QA_ENGINE !== engine) continue
    const browser = await loadPlaywright()[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE }) })
    try {
      const context = await browser.newContext({ viewport: { width, height: 896 }, isMobile: width === 414, hasTouch: width === 414, reducedMotion: 'reduce' })
      await context.route('**/api/**', route => {
        const url = new URL(route.request().url()), pathname = url.pathname
        const selected = utilities.find(u => pathname.endsWith('/' + u.id))
        const body = selected ? url.searchParams.get('view') === 'official' ? selected.officialMonitoring : selected
          : pathname === '/api/stats' ? stats
          : pathname === '/api/utilities' ? [utilities[0]]
          : pathname === '/api/utilities/scores' ? { scores: [] }
          : pathname === '/api/utilities/recent' ? { utilities: [] }
          : pathname === '/api/readings/recent' || pathname === '/api/activity' ? { items: [], counts: {} } : []
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message) })
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
      assert.deepEqual(errors, [])
      await page.getByText('EPA PFAS results', { exact: true }).waitFor({ state: 'visible' })
      await page.getByLabel('Search by ZIP code, city, state, or utility name', { exact: true }).fill('Chicago')
      await page.getByRole('button', { name: /Search water/ }).click()
      await page.getByRole('button', { name: 'View details' }).first().click()
      const dialog = page.getByTestId('utility-detail-dialog')
      await page.getByTestId('official-monitoring').waitFor({ state: 'visible' })
      assert.equal(await dialog.getByTestId('unassessed-score').isVisible(), false)
      assert.ok((await dialog.innerText()).includes('<4 ppt'))
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-testid="utility-detail-dialog"]')).opacity) === 1)
      await page.screenshot({ path: path.resolve('../../outputs', `epa-${engine}-${width}.png`) })
      await dialog.getByText('Explore 16 source results', { exact: true }).click()
      const sourceRegion = dialog.getByRole('region', { name: 'EPA source results' })
      assert.equal(await sourceRegion.locator('tbody tr').count(), 16)
      await sourceRegion.evaluate(node => { node.scrollTop = node.scrollHeight })
      assert.ok(await sourceRegion.evaluate(node => node.scrollTop > 0))
      await dialog.getByRole('button', { name: 'Share community card' }).click()
      await page.getByTestId('water-report-card-dialog').waitFor({ state: 'visible' })
      await page.getByRole('button', { name: 'Close report card', exact: true }).click()
      await dialog.getByRole('button', { name: width === 414 ? 'Back to results' : 'Close', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden')
      await page.goto('http://localhost:3000/#map', { waitUntil: 'networkidle' })
      const markers = page.getByTestId('utility-map-marker')
      await markers.first().waitFor({ state: 'visible' })
      assert.equal(await page.locator('[data-testid="utility-map-marker"][data-assessment="legal"]').count(), 1)
      assert.equal(await page.locator('[data-testid="utility-map-marker"][data-assessment="compared"]').count(), 1)
      await page.getByRole('button', { name: /Philadelphia Water Department/ }).last().click()
      await page.getByTestId('official-monitoring').waitFor({ state: 'visible' })
      assert.ok((await page.getByTestId('official-monitoring').innerText()).includes('above 4 ppt'))
      await page.getByTestId('utility-detail-dialog').getByRole('button', { name: 'Close', exact: true }).click()
      assert.deepEqual(errors, [])
      console.log(`PASS: ${engine} ${width}px: EPA search, non-detects, source scroll, share/close, map colors, no page errors`)
      await context.close()
    } finally { await browser.close() }
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
