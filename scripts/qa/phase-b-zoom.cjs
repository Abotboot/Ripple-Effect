/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser acceptance harness. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const out = path.resolve(process.env.QA_OUTPUT || 'docs/qa/phase-b/browser')
const extension = path.join(out, 'zoom-extension')
const report = { createdAt: new Date().toISOString(), base, success: false, method: 'Installed Chromium extension chrome.tabs.setZoom(tabId, 2), temporary profile', api: [], errors: [] }
fs.mkdirSync(extension, { recursive: true })
fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Isolated QA browser zoom', version: '1.0', permissions: ['tabs'], background: { service_worker: 'background.js' } }))
fs.writeFileSync(path.join(extension, 'background.js'), `chrome.tabs.onUpdated.addListener((id, info, tab) => { if (info.status === 'complete' && tab.url?.startsWith(${JSON.stringify(base)})) chrome.tabs.setZoom(id, 2); });`)
const save = () => fs.writeFileSync(path.join(out, 'browser-zoom-200.json'), JSON.stringify(report, null, 2))

;(async () => {
  // Run after phase-b-browser.cjs closes; only one browser instance at a time.
  const context = await chromium.launchPersistentContext('', {
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
    headless: true, viewport: null,
    args: ['--window-size=1440,900', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  })
  try {
    const page = context.pages()[0] || await context.newPage()
    const cdp = await context.newCDPSession(page)
    // With native tab zoom, Playwright's default clip can retain the old device
    // scale and crop the capture. Let Chromium capture its entire surface.
    const screenshot = async filename => {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
      fs.writeFileSync(path.join(out, filename), Buffer.from(data, 'base64'))
    }
    report.screenshotMethod = 'Playwright CDP Page.captureScreenshot; full browser surface, no clip or zoom override'
    page.on('pageerror', error => report.errors.push(error.message))
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) report.api.push(request.url()) })
    await page.goto(base + '/motion-study')
    await page.getByTestId('journey-watch').waitFor()
    await page.waitForFunction(() => devicePixelRatio === 2)
    await page.evaluate(() => document.fonts.ready)
    await page.getByTestId('hero-artwork').evaluate(i => i.decode())
    const geometry = await page.evaluate(() => ({ innerWidth, innerHeight, outerWidth, dpr: devicePixelRatio, visualViewportScale: visualViewport.scale, scrollWidth: document.documentElement.scrollWidth, cssZoom: getComputedStyle(document.documentElement).zoom }))
    assert.equal(geometry.dpr, 2)
    assert.equal(geometry.visualViewportScale, 1, 'Actual browser zoom rather than pinch scale')
    assert.equal(geometry.cssZoom, '1', 'Actual browser zoom rather than CSS zoom')
    assert(geometry.innerWidth < geometry.outerWidth / 2 + 1)
    assert(geometry.scrollWidth <= geometry.innerWidth + 1)
    await screenshot('browser-zoom-200.png')
    await page.getByTestId('journey-watch').click()
    // No stage scroll here: exercise the product's Watch behavior at 200%.
    await page.waitForFunction(() => (document.querySelector('video')?.currentTime || 0) > .3)
    const during = await page.locator('video').boundingBox()
    assert(during.y >= -1 && during.y < geometry.innerHeight, 'Watch video in viewport')
    const controls = []
    for (const id of ['journey-skip', 'journey-pause']) {
      const control = await page.getByTestId(id).evaluate(element => {
        const r = element.getBoundingClientRect()
        return { id: element.dataset.testid, x: r.x, y: r.y, width: r.width, height: r.height, hit: element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }
      })
      assert(control.hit && control.y >= 0 && control.y + control.height <= geometry.innerHeight, `${id} visible and unobscured before keyboard scrolling`)
      controls.push(control)
    }
    await screenshot('browser-zoom-200-watch.png')
    await page.keyboard.press('Tab')
    assert.equal(await page.getByTestId('journey-pause').evaluate(e => e === document.activeElement), true)
    await page.keyboard.press('Space')
    assert.equal(await page.locator('video').evaluate(v => v.paused), true)
    await page.keyboard.press('Escape')
    await page.getByTestId('journey-watch').waitFor()
    assert.equal(await page.locator('#study-search').evaluate(e => e === document.activeElement), true)
    await page.locator('#study-search').fill('Austin')
    await page.locator('#study-search').press('Enter')
    assert.match(await page.locator('#search').innerText(), /Input preserved: “Austin”/)
    const input = await page.locator('#study-search').boundingBox()
    assert(input.y >= -1 && input.y + input.height <= await page.evaluate(() => innerHeight) + 1, 'Focused search remains visible')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
    await screenshot('browser-zoom-200-search.png')
    assert.deepEqual(report.api, [])
    assert.deepEqual(report.errors, [])
    Object.assign(report, { success: true, geometry, during, controls, watchHarnessScroll: false, keyboardPauseEscapeSearch: 'pass' })
    console.log('PASS: actual 200% browser zoom, natural Watch, keyboard pause/Escape, focused HTML search', geometry)
  } finally { save(); await context.close() }
})().catch(error => { report.success = false; report.errors.push(error.stack); save(); console.error(error); process.exitCode = 1 })
