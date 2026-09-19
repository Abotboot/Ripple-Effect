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
  assert.match(await id(page, 'hero-artwork').getAttribute('src'), /photo-cutouts\/fragment.webp/)
  const locks = await page.evaluate(() => ({ inert: document.querySelectorAll('[inert]').length, position: document.body.style.position, overflow: document.documentElement.style.overflow, y: scrollY }))
  assert.deepEqual(locks, { inert: 0, position: '', overflow: '', y: 0 })
  const search = page.locator('.tank-search input')
  await search.fill('Chicago')
  assert.equal(await search.inputValue(), 'Chicago')
  await search.fill('')
}

;(async () => {
  const playwright = loadPlaywright()
  const engine = process.env.QA_BROWSER === 'webkit' ? 'webkit' : 'chromium'
  report.engine = engine
  const browser = await playwright[engine].launch({ ...(engine === 'chromium' ? { channel: 'chrome' } : {}), headless: true })
  try {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 414, height: 896 }, { width: 320, height: 568 }]) {
      const label = `${viewport.width}x${viewport.height}`
      const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500, isMobile: viewport.width < 500, recordVideo: { dir: output, size: viewport } })
      await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Unavailable in image test"}' }))
      const page = await context.newPage()
      page.setDefaultTimeout(20000)
      page.on('pageerror', error => { report.pageErrors ??= []; report.pageErrors.push(error.message) })
      await page.goto(base + '/#home', { waitUntil: 'domcontentloaded' })
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
      await page.waitForFunction(first => {
        const node = document.querySelector('[data-testid="journey-handoff"]')
        return node && Number(getComputedStyle(node).opacity) < first - .05
      }, firstOpacity, { timeout: 1200 })
      const nextOpacity = await id(page, 'journey-handoff').evaluate(node => Number(getComputedStyle(node).opacity))
      assert(nextOpacity < firstOpacity, `Terminal frame must visibly dissolve (${firstOpacity} -> ${nextOpacity})`)
      await page.screenshot({ path: path.join(output, `${label}-dissolve.png`) })
      await live(page)
      const replayBounds = await id(page, 'journey-watch').boundingBox()
      assert(replayBounds.y >= 0 && replayBounds.y + replayBounds.height <= viewport.height, 'Replay is visible above the fold')
      await page.waitForFunction(() => { const img = document.querySelector('[data-testid="hero-artwork"]'); return img?.complete && img.naturalWidth > 0 })
      assert.equal(await id(page, 'hero-cutout-scene').locator('img').count(), 160, 'Dense field composed from transparent sprites')
      assert(await id(page, 'ripple-media').evaluate(node => node.getBoundingClientRect().height > 250), 'Mobile media container must not collapse under size containment')
      assert.equal(await id(page, 'hero-artwork').evaluate(node => getComputedStyle(node).objectFit), 'contain', 'Cutouts fit without edge cropping')
      await page.screenshot({ path: path.join(output, `${label}-live.png`) })
      await id(page, 'field-fibers').click()
      assert.equal(await id(page, 'field-fibers').getAttribute('aria-pressed'), 'true')
      assert.equal(await id(page, 'particle-stage').getAttribute('data-category'), 'fibers')
      assert.equal(await id(page, 'hero-cutout-scene').locator('[data-form="fibers"]').first().getAttribute('data-highlighted'), 'true')
      await id(page, 'field-pause').click()
      assert.equal(await id(page, 'hero-cutout-scene').getAttribute('data-motion'), 'false')
      await id(page, 'journey-watch').click()
      await id(page, 'journey-enter').waitFor()
      assert.equal(await page.evaluate(() => scrollY), 0)
      assert.equal(await id(page, 'journey-video').count(), 0)
      await id(page, 'journey-enter').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
      await live(page)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      for (const form of ['fibers', 'fragments', 'granules']) {
        await page.locator(`#atlas-tab-${form}`).click()
        const panel = id(page, `atlas-panel-${form}`)
        await panel.waitFor({ state: 'visible' })
        assert.match(await panel.locator('img').getAttribute('src'), /\/photographs\//)
        await panel.locator('img').evaluate(img => img.decode())
        assert.equal(await panel.locator('a').count(), 2, 'Source and license are accessible')
      }
      await page.locator('#particle-atlas').scrollIntoViewIfNeeded()
      await page.locator('#particle-atlas').screenshot({ path: path.join(output, `${label}-photo-atlas.png`) })
      const sample = page.locator('#sample-study')
      await sample.scrollIntoViewIfNeeded()
      await sample.locator('img').evaluate(img => img.decode())
      assert.match(await sample.locator('img').getAttribute('src'), /photo-cutouts\/microscope-detail.webp/)
      await sample.screenshot({ path: path.join(output, `${label}-photo-sample.png`) })
      assert.equal(await page.locator('#particle-atlas img[src*="/layers/"], #sample-study img[src*="sample-study-panel"]').count(), 0)
      const video = page.video()
      await context.close()
      await video.saveAs(path.join(output, `${label}-normal-speed.webm`))
      report.checks.push({ name: label, passed: true, videoBounds, boundary, firstOpacity, nextOpacity })
    }
    for (const scenario of ['reduced', 'escape-handoff', 'animation-disabled', 'artwork-failure', 'video-failure']) {
      const context = await browser.newContext({ reducedMotion: scenario === 'reduced' ? 'reduce' : 'no-preference' })
      await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Unavailable in image test"}' }))
      const page = await context.newPage()
      page.setDefaultTimeout(20000)
      if (scenario === 'artwork-failure') await page.route('**/photo-cutouts/fragment.webp', route => route.abort())
      if (scenario === 'video-failure') await page.route('**/microscope-journey-v4.mp4', route => route.abort())
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      if (scenario === 'reduced') {
        await page.locator('.tank-search input').fill('Chicago')
        assert.equal(await id(page, 'journey-video').count(), 0)
        assert.equal(await id(page, 'journey-handoff').count(), 0)
        assert.equal(await id(page, 'journey-enter').count(), 0)
        await id(page, 'journey-watch').click()
        await id(page, 'journey-enter').waitFor()
        await id(page, 'journey-enter').click()
        await live(page)
        assert.equal(await id(page, 'journey-video').count(), 0, 'Manual reduced-motion preview stays static')
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
