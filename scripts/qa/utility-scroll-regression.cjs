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
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 568 }]) {
      const context = await browser.newContext({ viewport })
      await context.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'))
      await context.route('**/api/**', route => {
        assert.equal(route.request().method(), 'GET', 'No mutation in browser checks')
        const url = new URL(route.request().url())
        const fixtures = {
          '/api/utilities': utilities,
          ['/api/utilities/' + utility.id]: utility,
          '/api/utilities/scores': { scores: [] },
          '/api/utilities/recent': { utilities: [] },
          '/api/readings/recent': { items: [] },
          '/api/auth/me': { user: null },
          '/api/activity': { items: [], counts: { samples: 0, reports: 0, chapters: 0, donations: 0 } },
        }
        return route.fulfill({ status: Object.hasOwn(fixtures, url.pathname) ? 200 : 503,
          contentType: 'application/json', body: JSON.stringify(fixtures[url.pathname] ?? { error: 'Unavailable in test' }) })
      })
      const page = await context.newPage()
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.locator('.tank-search input').fill('Chicago')
      await page.locator('.tank-search button[type="submit"]').click()
      const card = page.getByRole('button', { name: 'View details', exact: true })
      await card.first().click()
      const dialog = page.getByTestId('utility-detail-dialog')
      await dialog.waitFor()
      const body = page.getByTestId('utility-detail-scroll')
      await body.hover()
      const before = await body.evaluate(node => node.scrollTop)
      const pageBefore = await page.evaluate(() => scrollY)
      await page.mouse.wheel(0, 450)
      await page.waitForFunction(() => document.querySelector('[data-testid="utility-detail-scroll"]')?.scrollTop > 100)
      const after = await body.evaluate(node => node.scrollTop)
      assert(after > before, 'Wheel must scroll the utility panel')
      assert.equal(await page.evaluate(() => scrollY), pageBefore, 'Background must stay still')
      await body.focus()
      await page.keyboard.press('PageDown')
      await page.waitForFunction(value => document.querySelector('[data-testid="utility-detail-scroll"]')?.scrollTop > value, after)
      assert(!/residents served|Population served|Historical observations|verification metadata/i.test(await dialog.innerText()))
      await page.screenshot({ path: path.join(output, `${viewport.width}-utility-scrolled.png`) })
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => document.body.style.overflow), '')
      assert.equal(await page.getByTestId('specimen-inspector').count(), 0)
      assert.equal(await page.getByText('View original illustration', { exact: true }).count(), 0)
      assert(!/residents served|Population served/i.test(await page.locator('body').innerText()))
      const atlasLink = page.locator('#particle-atlas a[href="#sample-study"]')
      await atlasLink.click()
      assert.equal(await page.locator('#sample-study').count(), 1)
      await page.getByRole('tab', { name: 'Fragments', exact: true }).click()
      assert.equal(await page.getByRole('tab', { name: 'Fragments', exact: true }).getAttribute('aria-selected'), 'true')
      await page.goto(base + '/motion-study', { waitUntil: 'domcontentloaded' })
      assert.equal(await page.getByTestId('specimen-inspector').count(), 0)
      assert.equal(await page.getByText('View original illustration', { exact: true }).count(), 0)
      await context.close()
      report.checks.push({ viewport, before, after, passed: true })
    }
    report.passed = true
  } finally { await browser.close() }
})().catch(error => { report.error = error.stack; process.exitCode = 1 }).finally(() => {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
})
