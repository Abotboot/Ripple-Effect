/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression with synthetic fixtures. */
const assert = require('node:assert/strict')
const { loadPlaywright } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jlp0AAAAASUVORK5CYII=', 'base64')
const utility = { id: 'qa-utility', pwsid: 'QA-ONLY', name: 'Fixture Utility', city: 'Chicago', state: 'IL', latitude: 41.8781, longitude: -87.6298, population: 0, zipCodes: '00000', systemType: 'Community', sourceType: 'Surface', treatmentStatus: 'Treated', assessment: { status: 'assessed', sampleCount: 1, eligibleSampleCount: 1, healthCompared: 1, legalCompared: 1, healthAbove: 1, legalAbove: 1 }, contaminantExceedances: { lead: true } }
const stats = { mapUtilities: [utility], utilitiesCount: 1, contaminantsCount: 1, samplesCount: 1, statesCovered: 1, sampleAssessment: utility.assessment, qualityCounts: {}, healthExceedances: 1, legalExceedances: 1 }

;(async () => {
  const checks = []
  for (const engine of ['chromium', 'webkit']) {
    const browser = await loadPlaywright()[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE }) })
    try {
      for (const width of [1440, 414]) {
        const context = await browser.newContext({ viewport: { width, height: 896 }, hasTouch: width === 414, isMobile: width === 414, reducedMotion: 'reduce' })
        await context.route('**/api/**', route => {
          const path = new URL(route.request().url()).pathname
          const body = path === '/api/stats' ? stats : path === '/api/utilities/near' ? { utilities: [{ ...utility, distanceMiles: 0 }] } : path === '/api/utilities/qa-utility' ? { ...utility, contaminantSummaries: [], totalSamples: 0, healthExceedances: 0, exceedances: 0, safetyScore: null } : []
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
        })
        let failTiles = false
        const zooms = new Set()
        await context.route('https://tile.openstreetmap.org/**', route => {
          zooms.add(Number(new URL(route.request().url()).pathname.split('/')[1]))
          return failTiles ? route.abort() : route.fulfill({ contentType: 'image/png', body: png })
        })
        const page = await context.newPage()
        await page.goto(`${process.env.QA_BASE_URL || 'http://localhost:3000'}/#map`, { waitUntil: 'networkidle' })
        const map = page.getByTestId('street-map')
        await map.waitFor({ state: 'visible' })
        assert.equal(await map.getAttribute('data-zoom'), '4')
        assert.equal(await page.getByTestId('utility-map-marker').getAttribute('data-assessment'), 'legal')
        await page.getByRole('button', { name: 'Chicago, IL', exact: true }).click()
        await page.waitForFunction(() => document.querySelector('[data-testid="street-map"]')?.dataset.zoom === '13')
        await map.scrollIntoViewIfNeeded()
        for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
        assert.equal(await map.getAttribute('data-zoom'), '19')
        assert.ok(zooms.has(19), 'Neighborhood tiles requested at zoom 19')
        await page.getByTestId('utility-map-marker').click()
        await page.getByTestId('utility-detail-dialog').waitFor({ state: 'visible' })
        await page.getByTestId('utility-detail-dialog').getByRole('button', { name: 'Close', exact: true }).click()
        await page.getByTestId('utility-detail-dialog').waitFor({ state: 'hidden' })
        await page.getByRole('button', { name: 'US overview', exact: true }).click()
        assert.equal(await map.getAttribute('data-zoom'), '4')
        assert.equal(await page.getByRole('link', { name: 'OpenStreetMap', exact: true }).count(), 1)
        failTiles = true
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
        await page.getByRole('button', { name: 'Retry map', exact: true }).waitFor({ state: 'visible' })
        failTiles = false
        await page.getByRole('button', { name: 'Retry map', exact: true }).click()
        await page.getByRole('button', { name: 'Retry map', exact: true }).waitFor({ state: 'hidden' })
        await page.locator('header').getByRole('button', { name: 'Home', exact: true }).count().then(async count => {
          if (count) await page.locator('header').getByRole('button', { name: 'Home', exact: true }).click()
        })
        checks.push(`${engine} ${width}px: zoom 4 to 19, tiles, legal marker, modal close, overview, attribution, tile failure/retry`)
        await context.close()
      }
    } finally { await browser.close() }
  }
  console.log(JSON.stringify({ passed: true, checks }, null, 2))
})().catch(error => { console.error(error); process.exitCode = 1 })
