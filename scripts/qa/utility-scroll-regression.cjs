/* eslint-disable @typescript-eslint/no-require-imports -- Local browser regression. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadPlaywright } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const output = path.resolve(process.env.QA_OUTPUT || 'docs/qa/utility-scroll')
fs.mkdirSync(output, { recursive: true })
const report = { base, checks: [], passed: false }

;(async () => {
  // Read-only public fixture. No local database or mutation is needed.
  const read = async route => {
    const response = await fetch('https://rippleeffecter.netlify.app' + route)
    assert.equal(response.status, 200)
    return response.json()
  }
  const utilities = await read('/api/utilities?q=Chicago')
  const utility = await read('/api/utilities/' + utilities[0].id)
  const stats = await read('/api/stats')
  const locations = await read('/api/stats?view=map')
  const playwright = loadPlaywright()
  const engine = process.env.QA_BROWSER === 'webkit' ? 'webkit' : 'chromium'
  report.engine = engine
  const browser = await playwright[engine].launch({ ...(engine === 'chromium' ? { channel: 'chrome' } : {}), headless: true })
  try {
    for (const viewport of [{ width: 414, height: 896 }, { width: 320, height: 568 }, { width: 896, height: 414 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true })
      await context.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'))
      await context.route('**/api/**', route => {
        assert.equal(route.request().method(), 'GET', 'No mutation in browser checks')
        const url = new URL(route.request().url())
        const fixtures = {
          '/api/utilities': utilities,
          '/api/stats': url.searchParams.get('view') === 'map' ? locations : stats,
          ['/api/utilities/' + utility.id]: utility,
          '/api/utilities/scores': { scores: [] },
          '/api/utilities/recent': { utilities: [{ ...utilities[0], sampleCount: utility.totalSamples }] },
          '/api/readings/recent': { items: [] },
          '/api/auth/me': { user: null },
          '/api/activity': { items: [], counts: { samples: 0, reports: 0, chapters: 0, donations: 0 } },
        }
        return route.fulfill({ status: Object.hasOwn(fixtures, url.pathname) ? 200 : 503,
          contentType: 'application/json', body: JSON.stringify(fixtures[url.pathname] ?? { error: 'Unavailable in test' }) })
      })
      const page = await context.newPage()
      page.setDefaultTimeout(20000)
      page.on('pageerror', error => { report.pageErrors ??= []; report.pageErrors.push(error.message) })
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => { const button = document.querySelector('[data-testid="journey-watch"]'); return button && !button.disabled })
      await page.locator('.tank-search input').fill('Chicago')
      await page.locator('.tank-search button[type="submit"]').click()
      const card = page.getByRole('button', { name: 'View details', exact: true })
      await card.first().click()
      const dialog = page.getByTestId('utility-detail-dialog')
      await dialog.waitFor()
      const close = dialog.getByRole('button', { name: 'Close', exact: true })
      assert(await close.evaluate(node => { const r = node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }), 'Close must remain touchable')
      const body = page.getByTestId('utility-detail-scroll')
      await body.hover()
      const before = await body.evaluate(node => node.scrollTop)
      const pageBefore = await page.evaluate(() => scrollY)
      if (engine === 'webkit') { await body.focus(); await page.keyboard.press('PageDown') }
      else await page.mouse.wheel(0, 450)
      await page.waitForFunction(() => document.querySelector('[data-testid="utility-detail-scroll"]')?.scrollTop > 100)
      const after = await body.evaluate(node => node.scrollTop)
      assert(after > before, 'Wheel must scroll the utility panel')
      assert.equal(await page.evaluate(() => scrollY), pageBefore, 'Background must stay still')
      await body.focus()
      await page.keyboard.press('PageDown')
      await page.waitForFunction(value => document.querySelector('[data-testid="utility-detail-scroll"]')?.scrollTop > value, after)
      assert(!/residents served|Population served|Historical observations|verification metadata/i.test(await dialog.innerText()))
      await page.screenshot({ path: path.join(output, `${viewport.width}-utility-scrolled.png`) })
      await dialog.getByRole('button', { name: 'Share community card' }).tap()
      const shared = page.getByTestId('water-report-card-dialog')
      await shared.waitFor()
      assert.equal(await shared.evaluate(node => node.scrollWidth > node.clientWidth), false)
      await shared.getByRole('button', { name: 'Close report card' }).tap()
      await shared.waitFor({ state: 'detached' })
      if (viewport.width < 640) await dialog.getByRole('button', { name: 'Back to results' }).tap()
      else await close.tap()
      await dialog.waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => document.body.style.overflow), '')
      assert.equal(await page.getByTestId('specimen-inspector').count(), 0)
      assert.equal(await page.getByText('View original illustration', { exact: true }).count(), 0)
      assert(!/residents served|Population served/i.test(await page.locator('body').innerText()))
      await page.getByRole('button', { name: 'Card', exact: true }).first().tap()
      await shared.waitFor()
      await shared.getByRole('button', { name: 'Back', exact: true }).tap()
      await shared.waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => document.body.style.overflow), '')
      await page.getByRole('button', { name: `View details for ${utility.name}`, exact: true }).tap()
      await dialog.waitFor()
      await close.tap()
      await dialog.waitFor({ state: 'detached' })
      const atlasLink = page.locator('#particle-atlas a[href="#sample-study"]')
      await atlasLink.click()
      assert.equal(await page.locator('#sample-study').count(), 1)
      await page.getByRole('tab', { name: 'Fragments', exact: true }).click()
      assert.equal(await page.getByRole('tab', { name: 'Fragments', exact: true }).getAttribute('aria-selected'), 'true')
      await page.goto(base + '/#map', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: new RegExp('^' + utility.name) }).first().tap()
      await dialog.waitFor()
      await close.tap()
      await dialog.waitFor({ state: 'detached' })
      await page.getByRole('button', { name: 'A Ripple Effect Initiative home' }).tap()
      await page.getByTestId('journey-watch').waitFor()
      await page.goto(base + '/#microplastics', { waitUntil: 'domcontentloaded' })
      await page.getByRole('tab', { name: /Plastics/ }).tap()
      for (const subject of ['microplastics', 'nanoplastics', 'microbeads', 'tire', 'fibers']) {
        const figure = page.getByTestId('illustration-' + subject)
        await figure.scrollIntoViewIfNeeded()
        await page.waitForFunction(key => [...document.querySelectorAll(`[data-testid="illustration-${key}"] img`)].every(image => image.complete && image.naturalWidth > 0), subject)
        const inspect = figure.getByRole('button', { name: /^Inspect/ })
        await inspect.tap()
        assert.equal(await inspect.getAttribute('aria-pressed'), 'true')
        await inspect.tap()
        assert.equal(await inspect.getAttribute('aria-pressed'), 'false')
        await figure.getByRole('button', { name: /^Pause/ }).tap()
        assert.equal(await figure.getAttribute('data-motion'), 'false')
        assert.equal(await figure.locator('img').first().evaluate(node => getComputedStyle(node).transform), 'none')
        if (viewport.width === 414) await figure.screenshot({ path: path.join(output, `414-${subject}.png`) })
      }
      await page.getByRole('button', { name: 'A Ripple Effect Initiative home' }).tap()
      await page.getByTestId('journey-watch').waitFor()
      await page.goto(base + '/motion-study', { waitUntil: 'domcontentloaded' })
      assert.equal(await page.getByTestId('specimen-inspector').count(), 0)
      assert.equal(await page.getByText('View original illustration', { exact: true }).count(), 0)
      await context.close()
      report.checks.push({ viewport, before, after, passed: true, flows: ['search detail', 'nested share', 'standalone share', 'recent utility', 'map utility', 'atlas', 'five illustrated plastic cards', 'return home'] })
    }
    report.passed = true
  } finally { await browser.close() }
})().catch(error => { report.error = error.stack; process.exitCode = 1 }).finally(() => {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
})
