/* eslint-disable @typescript-eslint/no-require-imports -- bounded installed-browser Phase F QA harness. */
'use strict'

if (process.env.QA_POLISH_BROWSER !== '1') {
  console.error('Refusing to launch a browser. Set QA_POLISH_BROWSER=1 only after prime confirms worker-5 has closed Chrome/Playwright.')
  process.exit(2)
}

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const out = __dirname
const only = (process.env.QA_ONLY || '').split(',').map(value => value.trim()).filter(Boolean)
const mergeResults = process.env.QA_MERGE === '1'
const previous = mergeResults && fs.existsSync(path.join(out, 'results.json'))
  ? JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'))
  : null
const report = {
  createdAt: new Date().toISOString(),
  base,
  success: false,
  introBypass: "sessionStorage['ripple-entered']=1",
  checks: previous?.checks ?? [],
}

const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2))
const shot = (page, name, options = {}) => page.screenshot({ path: path.join(out, `${name}.png`), ...options })
const json = (route, status, body, headers = {}) => route.fulfill({
  status,
  contentType: 'application/json',
  headers,
  body: JSON.stringify(body),
})

const assessmentUnavailable = {
  status: 'unavailable', sampleCount: null, eligibleSampleCount: null,
  healthCompared: null, legalCompared: null, healthAbove: null, legalAbove: null,
}
const assessmentCompared = {
  status: 'assessed', sampleCount: 4, eligibleSampleCount: 4,
  healthCompared: 4, legalCompared: 4, healthAbove: 1, legalAbove: 0,
}
const utility = {
  id: 'qa-utility-1', pwsid: 'QA0001', name: 'QA Water Utility', city: 'Austin', state: 'TX',
  zipCodes: '78701', county: 'Travis', population: 125000, systemType: 'Community',
  sourceType: 'Surface Water', treatmentStatus: 'Treated', latitude: 30.2672, longitude: -97.7431,
  website: null, notes: null, createdAt: '2026-09-18T12:00:00.000Z', updatedAt: '2026-09-18T12:00:00.000Z',
}
const utility2 = {
  ...utility, id: 'qa-utility-2', pwsid: 'QA0002', name: 'QA River Utility', city: 'Fort Worth',
  zipCodes: '76102', county: 'Tarrant', population: 98000, latitude: 32.7555, longitude: -97.3308,
}
const mapLocations = {
  mapUtilities: [
    { id: utility.id, name: utility.name, city: utility.city, state: utility.state, pwsid: utility.pwsid, population: utility.population, latitude: utility.latitude, longitude: utility.longitude, assessment: assessmentUnavailable },
    { id: utility2.id, name: utility2.name, city: utility2.city, state: utility2.state, pwsid: utility2.pwsid, population: utility2.population, latitude: utility2.latitude, longitude: utility2.longitude, assessment: assessmentUnavailable },
  ],
  locationsCount: 2,
  unmappedCount: 0,
  assessments: 'not_requested',
}
const statsFixture = {
  dataStatus: { status: 'available', code: null, provenanceAvailable: true },
  sampleAssessment: assessmentCompared,
  utilitiesCount: 2, contaminantsCount: 6, samplesCount: 42, reportsCount: 0, volunteersCount: 0,
  chaptersCount: 0, donationsCount: 0, donationsTotal: 0, statesCovered: 1, populationServed: 223000,
  microplasticsAvg: null, healthExceedances: 1, legalExceedances: 0, trackedByUsCount: 1,
  qualityCounts: { verified: 20, provisional: 8, citizen: 5, unreviewed: 7, illustrative: 2 },
  mapUtilities: [
    { ...mapLocations.mapUtilities[0], assessment: assessmentCompared },
    { ...mapLocations.mapUtilities[1], assessment: assessmentUnavailable },
  ],
}

async function prepContext(browser, { width = 1440, height = 900, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 500,
    reducedMotion,
    serviceWorkers: 'block',
  })
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ripple-entered', '1') } catch { /* optional storage */ }
  })
  return context
}

async function readyHome(page) {
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
  await page.locator('#search').waitFor()
  await page.evaluate(() => document.fonts.ready)
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  assert(dimensions.scrollWidth <= dimensions.width + 1, `${label}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.width}`)
  return dimensions
}

function transitionIsZero(value) {
  return value.split(',').every(part => Number.parseFloat(part) === 0)
}

function assertNoLeak(text, label) {
  const forbidden = /\bprototype\b|continuation[ -]?proof|\bphase\s*f\b|opening-v\d|terminal-v\d|microscope-journey-v\d/i
  assert.equal(forbidden.test(text), false, `${label}: visible prototype/status/media filename leak`)
}

async function run(browser, name, contextOptions, verify) {
  if (only.length && !only.includes(name)) return
  const context = await prepContext(browser, contextOptions)
  const page = await context.newPage()
  page.setDefaultTimeout(18000)
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  try {
    const detail = await verify(page, context)
    assert.deepEqual(pageErrors, [], `${name}: page errors`)
    const check = { name, passed: true, viewport: contextOptions, detail }
    const index = report.checks.findIndex(entry => entry.name === name)
    if (index >= 0) report.checks[index] = check
    else report.checks.push(check)
    console.log('PASS', name)
  } catch (error) {
    const check = { name, passed: false, viewport: contextOptions, error: error.stack, pageErrors }
    const index = report.checks.findIndex(entry => entry.name === name)
    if (index >= 0) report.checks[index] = check
    else report.checks.push(check)
    await shot(page, `failure-${name}`, { fullPage: true }).catch(() => {})
    console.error('FAIL', name, error.message)
  } finally {
    await context.close()
    save()
  }
}

;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()

  try {
    await run(browser, 'desktop-live-baseline', { width: 1440, height: 900 }, async (page, context) => {
      await context.route('**/api/stats', route => json(route, 200, statsFixture))
      await readyHome(page)
      assert(await page.getByTestId('header-donate').isVisible())
      const overflow = await noOverflow(page, 'desktop home')

      const samples = page.getByText('Samples', { exact: true }).first()
      await samples.waitFor()
      const samplesEvidence = await samples.locator('xpath=../..').innerText()
      assert.match(samplesEvidence, /Samples/i)

      await page.getByRole('heading', { name: 'Read the evidence label' }).scrollIntoViewIfNeeded()
      for (const label of ['Verified', 'Provisional', 'Citizen', 'Unreviewed', 'Illustrative']) {
        await page.getByText(label, { exact: true }).waitFor()
      }
      const reviewEvidence = await page.getByRole('heading', { name: 'Read the evidence label' }).locator('xpath=..').innerText()
      await shot(page, 'desktop-counts-review')

      await page.locator('#particle-atlas').scrollIntoViewIfNeeded()
      await page.getByRole('tab', { name: 'Fragments', exact: true }).click()
      await page.getByRole('tab', { name: 'Fragments', exact: true }).press('ArrowRight')
      assert.equal(await page.getByRole('tab', { name: 'Granules', exact: true }).getAttribute('aria-selected'), 'true')
      await shot(page, 'desktop-atlas')
      await page.getByRole('button', { name: /Methodology & sources/ }).first().click()
      await page.getByRole('heading', { name: 'Integrated data sources' }).waitFor()

      await readyHome(page)
      await page.locator('#sample-study').scrollIntoViewIfNeeded()
      assert.match(await page.getByTestId('study-count').innerText(), /240,000/)
      await page.getByRole('button', { name: /Methodology & sources/ }).last().click()
      await page.getByRole('heading', { name: 'Integrated data sources' }).waitFor()

      await readyHome(page)
      const specimen = page.getByTestId('specimen-inspector')
      await specimen.scrollIntoViewIfNeeded()
      const overview = specimen.locator('.specimen-overview')
      assert.match(await overview.innerText(), /whole-bottle image has no particle overlay/i)
      assert.equal(await overview.locator('canvas,svg').count(), 0)
      await page.getByTestId('specimen-uv').click()
      const detailCanvas = page.getByTestId('specimen-detail-canvas')
      await detailCanvas.waitFor({ state: 'visible' })
      assert.match(await detailCanvas.getAttribute('aria-label'), /Separately illustrated/i)
      assert.match(await specimen.locator('.specimen-detail-label').innerText(), /Not a scan result/i)
      await shot(page, 'desktop-study-specimen')

      const homeText = await page.locator('.home-data').innerText()
      assertNoLeak(homeText, 'home owned surfaces')
      await page.locator('#search').scrollIntoViewIfNeeded()
      await shot(page, 'desktop-home')
      return { overflow, samplesEvidence, reviewEvidence, atlasKeyboard: true, studyCounter: '≈240,000', specimenSeparated: true }
    })

    await run(browser, 'assessment-error-to-missing', { width: 1440, height: 900 }, async (page, context) => {
      let scoreMode = 'error'
      await context.route('**/api/utilities/scores', route => scoreMode === 'error'
        ? json(route, 503, { error: 'QA assessment unavailable' })
        : json(route, 200, { scores: [] }))
      await context.route('**/api/utilities?*', route => {
        const url = new URL(route.request().url())
        return url.searchParams.get('q') === 'phase-f-qa' ? json(route, 200, [utility]) : route.fallback()
      })
      await readyHome(page)
      await page.locator('#tank-search-input').fill('phase-f-qa')
      await page.locator('#tank-search-input').press('Enter')
      await page.getByText(utility.name, { exact: true }).waitFor()
      await page.getByTestId('utility-assessment-error').waitFor()
      assert.match(await page.getByTestId('utility-assessment-error').innerText(), /No score or pass\/fail state is inferred/i)
      await shot(page, 'desktop-assessment-error')

      scoreMode = 'missing'
      await page.getByRole('button', { name: 'Retry assessments', exact: true }).click()
      await page.getByText('Unassessed', { exact: true }).waitFor()
      await page.getByText('No data', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Testing & contribution options', exact: true }).waitFor()
      assert.equal(await page.getByTestId('utility-assessment-error').count(), 0)
      await shot(page, 'desktop-unassessed')
      return { locationPreserved: true, retry: true, missingState: 'Unassessed / No data', testingCta: true }
    })

    await run(browser, 'home-feed-retries', { width: 1440, height: 900 }, async (page, context) => {
      const state = { activity: false, recent: false, readings: false }
      await context.route('**/api/activity', route => state.activity
        ? json(route, 200, { items: [{ id: 'qa-a1', type: 'sample', date: '2026-09-19T12:00:00.000Z', title: 'QA activity recovered', subtitle: 'Recovered activity fixture', tone: 'info' }], counts: { samples: 1, reports: 0, chapters: 0, donations: 0 } })
        : json(route, 503, { error: 'QA activity failure' }))
      await context.route('**/api/utilities/recent', route => state.recent
        ? json(route, 200, { utilities: [{ id: utility.id, name: 'QA Recent Utility', city: utility.city, state: utility.state, pwsid: utility.pwsid, population: utility.population, sourceType: utility.sourceType, treatmentStatus: utility.treatmentStatus, createdAt: utility.createdAt, sampleCount: 3 }] })
        : json(route, 503, { error: 'QA recent utility failure' }))
      await context.route('**/api/readings/recent', route => state.readings
        ? json(route, 200, { items: [{ id: 'qa-r1', level: 1.25, unit: 'particles/L', location: 'QA Creek', treatmentStatus: 'Untreated', sampleDate: '2026-09-18', createdAt: '2026-09-19T12:00:00.000Z', source: 'Citizen Test', robot: false, reporterName: 'QA volunteer', contaminant: { name: 'Microplastics', slug: 'microplastics' }, utility: null, exceedsHealth: false, exceedsLegal: false }], count: 1 })
        : json(route, 503, { error: 'QA recent readings failure' }))
      await readyHome(page)

      for (const name of ['Retry activity', 'Retry locations', 'Retry readings']) await page.getByRole('button', { name, exact: true }).waitFor()
      await page.getByRole('button', { name: 'Retry activity', exact: true }).scrollIntoViewIfNeeded()
      await shot(page, 'desktop-feed-errors')

      state.activity = true
      await page.getByRole('button', { name: 'Retry activity', exact: true }).click()
      await page.getByText('QA activity recovered', { exact: true }).waitFor()
      state.recent = true
      await page.getByRole('button', { name: 'Retry locations', exact: true }).click()
      await page.getByText('QA Recent Utility', { exact: true }).waitFor()
      state.readings = true
      await page.getByRole('button', { name: 'Retry readings', exact: true }).click()
      await page.getByText('QA volunteer', { exact: true }).waitFor()
      return { explicitErrors: true, activityRecovered: true, locationsRecovered: true, readingsRecovered: true }
    })

    await run(browser, 'donate-total-retry', { width: 1440, height: 900 }, async (page, context) => {
      let hcbHealthy = false
      await context.route('https://hcb.hackclub.com/api/v3/organizations/a-ripple-effect-initiative-arei', route => hcbHealthy
        ? json(route, 200, { balances: { total_raised: 123456 }, demo_mode: false }, { 'access-control-allow-origin': '*' })
        : json(route, 503, { error: 'QA HCB failure' }, { 'access-control-allow-origin': '*' }))
      await page.goto(base + '/#donate', { waitUntil: 'domcontentloaded' })
      await page.getByTestId('donation-page').waitFor()
      assert(await page.getByTestId('header-donate').isVisible())
      await page.getByText('Total unavailable', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Retry total', exact: true }).waitFor()
      assert.doesNotMatch(await page.getByTestId('donation-total').innerText(), /^\$0(?:\.00)?$/)
      await noOverflow(page, 'desktop donate')
      assertNoLeak(await page.getByTestId('donation-page').innerText(), 'donate owned surface')
      await shot(page, 'desktop-donate-unavailable')

      hcbHealthy = true
      await page.getByRole('button', { name: 'Retry total', exact: true }).click()
      await page.getByText('$1,234.56', { exact: true }).waitFor()
      await shot(page, 'desktop-donate-recovered')
      return { headerDonateVisible: true, unavailableNeverZero: true, retryRecovered: '$1,234.56' }
    })

    await run(browser, 'map-background-failure', { width: 1440, height: 900 }, async (page, context) => {
      await context.route('**/api/stats*', route => {
        const url = new URL(route.request().url())
        return url.searchParams.get('view') === 'map' ? json(route, 200, mapLocations) : json(route, 200, statsFixture)
      })
      await context.route('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json', route => json(route, 503, { error: 'QA geography failure' }))
      await page.goto(base + '/#map', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Water utilities across America' }).waitFor()
      await page.getByText(/map background could not load/i).waitFor()
      await page.getByRole('button', { name: 'Retry map background', exact: true }).waitFor()
      await page.getByText('All utilities (2)', { exact: true }).waitFor()
      await page.getByText(utility.name, { exact: true }).waitFor()
      await page.getByText(utility2.name, { exact: true }).waitFor()
      const mapSection = page.getByRole('heading', { name: 'Water utilities across America' }).locator('xpath=ancestor::section')
      assert.equal(await mapSection.locator('canvas,img[src*="snapshot"],img[alt*="snapshot" i]').count(), 0)
      await noOverflow(page, 'desktop map background failure')
      await shot(page, 'desktop-map-background-error')
      return { listPreserved: 2, retryVisible: true, fakeSnapshotNodes: 0 }
    })

    await run(browser, 'reduced-motion', { width: 390, height: 844, reducedMotion: 'reduce' }, async page => {
      await readyHome(page)
      const headerTransition = await page.getByTestId('header-donate').evaluate(el => getComputedStyle(el).transitionDuration)
      await page.locator('#particle-atlas').scrollIntoViewIfNeeded()
      const atlasTransition = await page.getByRole('tab', { name: 'Fibers', exact: true }).evaluate(el => getComputedStyle(el).transitionDuration)
      assert(transitionIsZero(headerTransition), `header transition still active: ${headerTransition}`)
      assert(transitionIsZero(atlasTransition), `atlas transition still active: ${atlasTransition}`)

      await page.locator('#sample-study').scrollIntoViewIfNeeded()
      assert.match(await page.getByTestId('study-count').innerText(), /240,000/)
      const replay = page.getByTestId('study-replay')
      assert.match(await replay.innerText(), /Motion reduced/)
      assert(await replay.isDisabled())

      await page.getByTestId('specimen-inspector').scrollIntoViewIfNeeded()
      await page.getByTestId('specimen-uv').click()
      const specimenPause = page.getByTestId('specimen-pause')
      assert.equal(await specimenPause.innerText(), 'Motion reduced')
      assert(await specimenPause.isDisabled())
      await shot(page, 'reduced-motion')
      return { headerTransition, atlasTransition, studyCounterReadable: true, specimenMotionDisabled: true }
    })

    await run(browser, 'mobile-layouts', { width: 390, height: 844 }, async (page, context) => {
      await context.route('**/api/stats*', route => {
        const url = new URL(route.request().url())
        return url.searchParams.get('view') === 'map' ? json(route, 200, mapLocations) : route.fallback()
      })
      await context.route('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json', route => json(route, 503, { error: 'QA geography failure' }))
      await context.route('https://hcb.hackclub.com/api/v3/organizations/a-ripple-effect-initiative-arei', route => json(route, 200, { balances: { total_raised: 123456 }, demo_mode: false }, { 'access-control-allow-origin': '*' }))

      await readyHome(page)
      assert(await page.getByTestId('header-donate').isVisible())
      const homeOverflow = await noOverflow(page, 'mobile home')
      await page.locator('#particle-atlas').scrollIntoViewIfNeeded()
      await page.getByTestId('study-count').scrollIntoViewIfNeeded()
      await page.getByTestId('specimen-inspector').scrollIntoViewIfNeeded()
      await shot(page, 'mobile-home')

      await page.goto(base + '/#donate', { waitUntil: 'domcontentloaded' })
      await page.getByTestId('donation-page').waitFor()
      const donateOverflow = await noOverflow(page, 'mobile donate')
      await shot(page, 'mobile-donate')

      await page.goto(base + '/#map', { waitUntil: 'domcontentloaded' })
      await page.getByText('All utilities (2)', { exact: true }).waitFor()
      await page.getByText(/map background could not load/i).waitFor()
      const mapOverflow = await noOverflow(page, 'mobile map')
      await shot(page, 'mobile-map-background-error')
      return { homeOverflow, donateOverflow, mapOverflow, headerDonateVisible: true }
    })
  } finally {
    await browser.close()
    const expectedCount = mergeResults ? 7 : (only.length || 7)
    report.success = report.checks.length === expectedCount && report.checks.every(check => check.passed)
    report.completedAt = new Date().toISOString()
    save()
    if (!report.success) process.exitCode = 1
  }
})().catch(error => {
  report.fatal = error.stack
  report.completedAt = new Date().toISOString()
  save()
  console.error(error)
  process.exitCode = 1
})
