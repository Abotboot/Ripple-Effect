/* eslint-disable @typescript-eslint/no-require-imports -- Local browser regression. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadPlaywright } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')

const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const output = path.resolve(process.env.QA_OUTPUT || 'docs/qa/intro-handoff')
fs.mkdirSync(output, { recursive: true })
const report = { base, checks: [], passed: false }
const id = (page, name) => page.getByTestId(name)

async function live(page) {
  await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
  assert.equal(await id(page, 'journey-video').count(), 0)
  assert.equal(await id(page, 'journey-handoff').count(), 0)
  assert.match(await id(page, 'hero-artwork').getAttribute('src'), /particle-world-master/)
  const locks = await page.evaluate(() => ({ inert: document.querySelectorAll('[inert]').length, position: document.body.style.position, overflow: document.documentElement.style.overflow, y: scrollY }))
  assert.deepEqual(locks, { inert: 0, position: '', overflow: '', y: 0 })
  const search = page.locator('.tank-search input')
  await search.fill('Chicago')
  assert.equal(await search.inputValue(), 'Chicago')
  await search.fill('')
}

;(async () => {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 568 }]) {
      const label = `${viewport.width}x${viewport.height}`
      const context = await browser.newContext({ viewport, recordVideo: { dir: output, size: viewport } })
      const page = await context.newPage()
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await id(page, 'journey-enter').waitFor()
      assert.equal(await id(page, 'journey-video').count(), 0)
      await id(page, 'journey-enter').click()
      await id(page, 'journey-video').waitFor()
      assert.equal(await id(page, 'journey-video').evaluate(video => video.playbackRate), 1)
      const videoBounds = await id(page, 'journey-video').boundingBox()
      await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
      const boundary = await id(page, 'journey-handoff').boundingBox()
      assert.deepEqual(boundary, videoBounds, 'No reframing at video handoff')
      const firstOpacity = await id(page, 'journey-handoff').evaluate(node => Number(getComputedStyle(node).opacity))
      await page.waitForTimeout(250)
      const nextOpacity = await id(page, 'journey-handoff').evaluate(node => Number(getComputedStyle(node).opacity))
      assert(nextOpacity < firstOpacity, 'Terminal frame must visibly dissolve')
      await page.screenshot({ path: path.join(output, `${label}-dissolve.png`) })
      await live(page)
      await page.waitForFunction(() => document.querySelector('[data-testid="artwork-field"]')?.dataset.running === 'true')
      assert.equal(await id(page, 'artwork-field').getAttribute('data-entrance'), '1.0000', 'No second camera zoom')
      assert.equal(await id(page, 'artwork-field').evaluate(node => getComputedStyle(node).opacity), '1')
      await page.screenshot({ path: path.join(output, `${label}-live.png`) })
      await id(page, 'field-fibers').click()
      assert.equal(await id(page, 'field-fibers').getAttribute('aria-pressed'), 'true')
      assert.equal(await id(page, 'artwork-field').getAttribute('data-category'), 'fibers')
      await id(page, 'journey-watch').click()
      await id(page, 'journey-enter').waitFor()
      assert.equal(await page.evaluate(() => scrollY), 0)
      assert.equal(await id(page, 'journey-video').count(), 0)
      await id(page, 'journey-enter').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
      await live(page)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const video = page.video()
      await context.close()
      await video.saveAs(path.join(output, `${label}-normal-speed.webm`))
      report.checks.push({ name: label, passed: true, videoBounds, boundary, firstOpacity, nextOpacity })
    }
    for (const scenario of ['reduced', 'escape-handoff', 'animation-disabled', 'artwork-failure', 'video-failure']) {
      const context = await browser.newContext({ reducedMotion: scenario === 'reduced' ? 'reduce' : 'no-preference' })
      const page = await context.newPage()
      if (scenario === 'artwork-failure') await page.route('**/particle-world-master.webp', route => route.abort())
      if (scenario === 'video-failure') await page.route('**/microscope-journey-v4.mp4', route => route.abort())
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      if (scenario === 'reduced') {
        await page.locator('.tank-search input').fill('Chicago')
        assert.equal(await id(page, 'journey-video').count(), 0)
        assert.equal(await id(page, 'journey-handoff').count(), 0)
        assert.equal(await id(page, 'journey-enter').count(), 0)
      } else {
        if (scenario === 'animation-disabled') await page.addStyleTag({ content: '.ripple-handoff { animation: none !important; }' })
        await id(page, 'journey-enter').click()
        if (scenario === 'escape-handoff') {
          await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
          await page.keyboard.press('Escape')
        }
        if (scenario === 'artwork-failure') {
          await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
          assert.equal(await id(page, 'journey-handoff').count(), 0)
          await page.locator('.tank-search input').fill('Chicago')
        } else await live(page)
      }
      await context.close()
      report.checks.push({ name: scenario, passed: true })
    }
    report.passed = true
  } finally { await browser.close() }
})().catch(error => { report.error = error.stack; process.exitCode = 1 }).finally(() => {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
})
