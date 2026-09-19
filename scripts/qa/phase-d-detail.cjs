/* eslint-disable @typescript-eslint/no-require-imports -- Local UI with read-only published records. */
'use strict'
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const out = path.resolve('docs/qa/phase-d/detail')
fs.mkdirSync(out, { recursive: true })
const report = { createdAt: new Date().toISOString(), source: 'Public GET responses from preview3 supplied to localhost UI', checks: [], success: false }
const cache = new Map()
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2))
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' })
      const page = await context.newPage(), errors = [], writes = []
      page.setDefaultTimeout(30000)
      page.on('pageerror', e => errors.push(e.message))
      await context.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()), key = url.pathname + url.search
        if (req.method() !== 'GET') { writes.push(req.method()); return route.abort() }
        if (!cache.has(key)) cache.set(key, (async () => {
          const r = await fetch('https://deploy-preview-3--rippleeffecter.netlify.app' + key, { signal: AbortSignal.timeout(30000) })
          return { status: r.status, contentType: r.headers.get('content-type') || 'application/json', body: await r.text() }
        })())
        await route.fulfill(await cache.get(key))
      })
      try {
        await page.goto('http://localhost:3020/#map', { waitUntil: 'domcontentloaded' })
        const marker = page.getByTestId('utility-map-marker').first()
        await marker.waitFor(); await marker.focus(); await page.keyboard.press('Enter')
        const dialog = page.getByRole('dialog')
        await dialog.waitFor()
        assert.equal(await dialog.getAttribute('aria-modal'), 'true')
        assert.equal(await page.getByRole('button', { name: 'Close', exact: true }).evaluate(e => e === document.activeElement), true)
        await page.getByTestId('unassessed-score').waitFor()
        assert.equal(await dialog.getByText('Not assessed', { exact: true }).count(), 2)
        assert.equal(await dialog.getByText('0 (Critical)', { exact: true }).count(), 0)
        assert.equal(await dialog.locator('h2').first().evaluate(e => getComputedStyle(e).color), 'rgb(229, 239, 235)')
        await dialog.evaluate(e => {
          const items = [...e.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]')].filter(x => x.getClientRects().length && !x.closest('[hidden], [inert]'))
          items[items.length - 1].focus()
        })
        await page.keyboard.press('Tab')
        assert.equal(await dialog.getByRole('button', { name: 'Share community card', exact: true }).evaluate(e => e === document.activeElement), true)
        await page.screenshot({ path: path.join(out, `${width}-neutral-detail.png`) })
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' })
        assert.equal(await marker.evaluate(e => e === document.activeElement), true)
        assert.deepEqual(errors, []); assert.deepEqual(writes, [])
        report.checks.push({ width, height, passed: true, keyboardOpenAndTrap: true, escapeRestoresFocus: true, neutralUnassessed: true, errors, writes })
        console.log('PASS detail', width)
      } catch (e) { report.checks.push({ width, height, passed: false, error: e.stack, errors }); console.error(e.message) }
      finally { await context.close(); save() }
    }
  } finally { await browser.close(); report.success = report.checks.length === 2 && report.checks.every(c => c.passed); save(); if (!report.success) process.exitCode = 1 }
}
main().catch(e => { console.error(e); save(); process.exitCode = 1 })
