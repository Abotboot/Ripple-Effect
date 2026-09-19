/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local design review. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const out = __dirname
const report = { createdAt: new Date().toISOString(), base, checks: [], errors: [], success: false }
const save = () => fs.writeFileSync(path.join(out, 'design-results.json'), JSON.stringify(report, null, 2))
const emptyStats = {
  utilitiesCount: 0, contaminantsCount: 0, samplesCount: 0, reportsCount: 0,
  volunteersCount: 0, chaptersCount: 0, donationsCount: 0, donationsTotal: 0,
  statesCovered: 0, populationServed: 0, microplasticsAvg: null,
  healthExceedances: 0, legalExceedances: 0, trackedByUsCount: 0,
  qualityCounts: { verified: 0, provisional: 0, citizen: 0 }, mapUtilities: [],
}

async function decode(page, names) {
  const images = []
  for (const name of names) {
    const image = page.locator(`img[src*="${name}"]`)
    assert.equal(await image.count(), 1, `One actual ${name} image`)
    assert.equal(await image.getAttribute('loading'), 'lazy')
    await image.scrollIntoViewIfNeeded()
    images.push(await image.evaluate(async element => {
      await element.decode()
      return { src: element.currentSrc, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight }
    }))
  }
  return images
}

async function geometry(page) {
  return page.evaluate(() => {
    const scopes = ['#particle-atlas', '.water-narrative']
    const clipped = []
    for (const scope of scopes) for (const element of document.querySelectorAll(`${scope}, ${scope} *`)) {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) continue
      if (rect.left < -1 || rect.right > innerWidth + 1) clipped.push({ tag: element.tagName, text: element.textContent.slice(0, 70), left: rect.left, right: rect.right })
    }
    return {
      viewport: { width: innerWidth, height: innerHeight }, clipped,
      atlasHeight: document.querySelector('#particle-atlas').getBoundingClientRect().height,
      narrativeHeight: document.querySelector('.water-narrative').getBoundingClientRect().height,
      controls: [...document.querySelectorAll('#particle-atlas [role=tab], #particle-atlas a, .water-narrative a')].map(e => ({ name: e.textContent.trim(), height: e.getBoundingClientRect().height })),
    }
  })
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()
  async function review(name, options, work) {
    const { home = false, theme = 'dark', ...contextOptions } = options
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions })
    const api = [], media = [], errors = []
    await context.addInitScript(value => localStorage.setItem('theme', value), theme)
    await context.route('**/api/**', async route => {
      const request = route.request()
      const endpoint = new URL(request.url()).pathname
      api.push({ url: request.url(), method: request.method() })
      const fixtures = { '/api/stats': emptyStats, '/api/utilities': [], '/api/utilities/scores': { scores: [] }, '/api/utilities/recent': { utilities: [] }, '/api/activity': { items: [], counts: { samples: 0, reports: 0, chapters: 0, donations: 0 } }, '/api/readings/recent': { items: [] }, '/api/auth/me': { user: null } }
      const allowed = home && request.method() === 'GET' && Object.hasOwn(fixtures, endpoint)
      await route.fulfill({ status: allowed ? 200 : 503, contentType: 'application/json', body: JSON.stringify(allowed ? fixtures[endpoint] : { error: 'QA intercept: backend unavailable in this review' }) })
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => { if (decodeURIComponent(response.url()).includes('/media/ripple/')) media.push({ url: response.url(), status: response.status() }) })
    try {
      await page.goto(base + (home ? '/' : '/motion-study'), { waitUntil: 'domcontentloaded' })
      await page.getByRole('tab', { name: 'Fibers', exact: true }).waitFor()
      await page.evaluate(() => document.fonts.ready)
      const result = await work(page)
      assert.deepEqual(errors, [])
      if (!home) assert.deepEqual(api, [], 'Motion study must make zero API requests')
      report.checks.push({ name, success: true, apiPolicy: home ? 'Every API request intercepted with empty fixtures; no real backend access' : 'Zero API requests; unexpected endpoints intercepted', api, media, ...result })
      console.log('PASS', name)
    } catch (error) {
      report.errors.push({ name, error: error.stack, browserErrors: errors })
      await page.screenshot({ path: path.join(out, `${name}-failure.png`) }).catch(() => {})
      console.error('FAIL', name, error.message)
    } finally { await context.close(); save() }
  }
  try {
    for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568]]) {
      await review(`study-${width}`, { viewport: { width, height }, hasTouch: width < 500 }, async page => {
        const atlas = page.locator('#particle-atlas')
        const images = await decode(page, ['fibers-card', 'fragments-card', 'granules-card', 'sample-study-panel'])
        await atlas.screenshot({ path: path.join(out, `${width}-atlas-fibers.png`) })
        const tab = title => page.getByRole('tab', { name: title, exact: true })
        const selected = async title => {
          assert.equal(await tab(title).getAttribute('aria-selected'), 'true')
          assert.equal(await atlas.getByRole('tabpanel').count(), 1)
          assert.equal(await atlas.getByRole('tab', { selected: true }).count(), 1)
          assert.equal(await atlas.locator('[role=tab][tabindex="0"]').count(), 1)
          const panelId = await tab(title).getAttribute('aria-controls')
          assert.equal(await page.locator(`#${panelId}`).isVisible(), true)
          assert.equal(await tab(title).evaluate(e => e === document.activeElement), true)
        }
        await tab('Fibers').focus()
        await page.keyboard.press('ArrowRight'); await selected('Fragments')
        await page.keyboard.press('End'); await selected('Granules')
        await page.keyboard.press('ArrowRight'); await selected('Fibers')
        await page.keyboard.press('ArrowLeft'); await selected('Granules')
        await page.keyboard.press('Home'); await selected('Fibers')
        await page.keyboard.press('Tab')
        assert.equal(await atlas.getByRole('tabpanel').evaluate(e => e === document.activeElement), true)
        await tab('Fragments').click(); await selected('Fragments')
        assert.match(await atlas.getByRole('tabpanel').innerText(), /polymer type/)
        await atlas.screenshot({ path: path.join(out, `${width}-atlas-fragments.png`) })
        await atlas.locator('a[href="#specimen-study"]').click()
        assert.equal(new URL(page.url()).hash, '#specimen-study')
        await page.locator('#sample-study').screenshot({ path: path.join(out, `${width}-sample-record.png`) })
        await page.locator('.research-stage').screenshot({ path: path.join(out, `${width}-research.png`) })
        await page.locator('.countermeasure-stage').screenshot({ path: path.join(out, `${width}-contribute.png`) })
        assert.equal(await page.locator('.countermeasure-action').getAttribute('href'), '/#submit')
        assert.equal(await page.locator('.research-stage a').getAttribute('href'), 'https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water')
        const bounds = await geometry(page)
        assert.deepEqual(bounds.clipped, [])
        assert(bounds.controls.every(c => c.height >= 44), 'All new controls have at least 44px height')
        return { images, geometry: bounds, keyboard: 'ArrowRight, ArrowLeft, Home, End, wrap, Tab to panel', pointerSelection: 'Fragments', anchorsPreserved: true }
      })
    }
    await review('study-reduced-motion', { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }, async page => {
      await page.getByRole('tab', { name: 'Granules', exact: true }).click()
      assert.equal(await page.getByTestId('atlas-panel-granules').isVisible(), true)
      const state = await page.evaluate(() => ({
        transition: getComputedStyle(document.querySelector('#atlas-tab-granules')).transitionDuration,
        animations: [...document.querySelectorAll('.water-narrative')].flatMap(e => e.getAnimations({ subtree: true })).length,
        studyNumber: document.querySelector('.particle-number').textContent,
        videoCount: document.querySelectorAll('video').length,
      }))
      assert.equal(state.transition, '0s')
      assert.equal(state.animations, 0)
      assert.equal(state.videoCount, 0)
      assert.match(state.studyNumber, /240,000/)
      return state
    })
    for (const theme of ['dark', 'light']) await review(`home-${theme}`, { home: true, theme, colorScheme: theme }, async page => {
      await page.waitForFunction(dark => document.documentElement.classList.contains('dark') === dark, theme === 'dark')
      await decode(page, ['fibers-card', 'fragments-card', 'granules-card'])
      await page.locator('#particle-atlas').screenshot({ path: path.join(out, `home-${theme}-atlas.png`) })
      await page.locator('#search').screenshot({ path: path.join(out, `home-${theme}-search.png`) })
      const colors = await page.evaluate(() => {
        const style = selector => getComputedStyle(document.querySelector(selector))
        return {
          rootPrimary: style('html').getPropertyValue('--primary').trim(),
          headerPrimary: style('.site-header').getPropertyValue('--primary').trim(),
          searchPrimary: style('#search').getPropertyValue('--primary').trim(),
          benchmarkPrimary: style('[title="Safe Scientific Baseline"]').getPropertyValue('--primary').trim(),
          benchmarkRose: style('html').getPropertyValue('--chart-5').trim(),
          atlasHeading: style('#particle-atlas-title').color,
          atlasBackground: style('#particle-atlas').backgroundColor,
        }
      })
      assert.equal(colors.benchmarkPrimary, colors.rootPrimary, 'Data primary token retained outside decorative overrides')
      assert.equal(colors.atlasHeading, 'rgb(238, 234, 225)', 'Atlas stays readable in either site theme')
      if (theme === 'dark') { assert.equal(colors.headerPrimary, '#a9cdc4'); assert.equal(colors.searchPrimary, '#a9cdc4'); assert.equal(colors.rootPrimary, '#1df2b3') }
      else { assert.equal(colors.headerPrimary, colors.rootPrimary); assert.equal(colors.searchPrimary, colors.rootPrimary) }
      return { colors }
    })
  } finally { await browser.close(); report.success = report.errors.length === 0; report.completedAt = new Date().toISOString(); save() }
  if (!report.success) process.exitCode = 1
})().catch(error => { report.errors.push({ error: error.stack }); save(); console.error(error); process.exitCode = 1 })
