/* eslint-disable @typescript-eslint/no-require-imports -- Local browser regression. */
'use strict'
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const out = path.resolve('docs/qa/phase-d/counter')
fs.mkdirSync(out, { recursive: true })
const result = { createdAt: new Date().toISOString(), base, checks: [], success: false }
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2))
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const [width, height, reduce] of [[1440, 900, false], [390, 844, false], [320, 568, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduce ? 'reduce' : 'no-preference', serviceWorkers: 'block' })
      const page = await context.newPage(), api = [], errors = []
      page.setDefaultTimeout(18000)
      await context.route('**/api/**', route => { api.push(route.request().url()); return route.abort() })
      page.on('pageerror', error => errors.push(error.message))
      try {
        await page.goto(base + '/motion-study', { waitUntil: 'domcontentloaded' })
        const counter = page.getByTestId('study-counter')
        await page.getByTestId('journey-watch').waitFor()
        await counter.scrollIntoViewIfNeeded()
        if (reduce) {
          await page.waitForFunction(() => document.querySelector('[data-testid="study-counter"]')?.dataset.value === '240000')
          assert.equal(await page.getByTestId('study-replay').isDisabled(), true)
          assert.equal(await counter.getAttribute('data-running'), 'false')
        } else {
          await page.waitForFunction(() => document.querySelector('[data-testid="study-counter"]')?.dataset.state === 'counting')
          const initial = Number(await counter.getAttribute('data-value'))
          await page.waitForTimeout(250)
          assert(Number(await counter.getAttribute('data-value')) > initial)
          await page.getByTestId('study-pause').click()
          const frozen = await counter.getAttribute('data-value')
          await page.waitForTimeout(300)
          assert.equal(await counter.getAttribute('data-value'), frozen)
          assert.equal(await counter.getAttribute('data-running'), 'false')
          await page.getByTestId('study-pause').click()
          await page.waitForFunction(() => document.querySelector('[data-testid="study-counter"]')?.dataset.state === 'complete')
          assert.equal(await counter.getAttribute('data-value'), '240000')
          await page.getByTestId('study-replay').click()
          assert(Number(await counter.getAttribute('data-value')) < 240000)
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
          await page.waitForFunction(() => document.querySelector('[data-testid="study-counter"]')?.dataset.running === 'false')
          const offscreen = await counter.getAttribute('data-value')
          await page.waitForTimeout(300)
          assert.equal(await counter.getAttribute('data-value'), offscreen)
          await counter.scrollIntoViewIfNeeded()
          await page.waitForFunction(() => document.querySelector('[data-testid="study-counter"]')?.dataset.state === 'complete')
        }
        await page.getByTestId('study-breakdown-toggle').click()
        assert.equal(await page.locator('#study-size-breakdown').isVisible(), true)
        assert.equal(await page.locator('.study-dot-grid > span[data-nano=true]').count(), 90)
        assert.equal(await page.locator('.study-dot-grid > span').count(), 100)
        assert.match(await counter.innerText(), /not a live reading/)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
        await counter.scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(out, `${width}-count-and-breakdown.png`) })
        assert.deepEqual(api, []); assert.deepEqual(errors, [])
        result.checks.push({ width, height, reducedMotion: reduce, passed: true, count: 240000, nanoMarks: 90, noAPI: true })
        console.log('PASS counter', width, reduce)
      } catch (error) {
        result.checks.push({ width, height, reducedMotion: reduce, passed: false, error: error.stack, errors, api })
        await page.screenshot({ path: path.join(out, `${width}-failure.png`) }).catch(() => {})
        console.error('FAIL counter', width, error.message)
      } finally { await context.close(); save() }
    }
  } finally {
    await browser.close()
    result.success = result.checks.length === 3 && result.checks.every(check => check.passed)
    result.completedAt = new Date().toISOString(); save()
    if (!result.success) process.exitCode = 1
  }
}
main().catch(error => { console.error(error); save(); process.exitCode = 1 })
