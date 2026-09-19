/* eslint-disable @typescript-eslint/no-require-imports -- Local Playwright specimen review. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const out = __dirname
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const selected = process.env.SPECIMEN_QA_CASES?.split(',')
const report = { createdAt: new Date().toISOString(), base, checks: [], failures: [], recordings: [], success: false }
const save = () => fs.writeFileSync(path.join(out, 'specimen-results.json'), JSON.stringify(report, null, 2))
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const state = page => page.locator('.specimen-chamber canvas').evaluate(c => ({ ...c.dataset, width: c.width, height: c.height }))
const settled = page => page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.transition === 'settled')

async function ready(page) {
  await page.goto(base + '/motion-study', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('specimen-inspector').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.specimen-chamber canvas').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.rendered === 'macro')
}

async function freezeProof(page, expected) {
  await page.waitForFunction(value => document.querySelector('.specimen-chamber canvas')?.dataset.motion === value && document.querySelector('.specimen-chamber canvas')?.dataset.running === 'false', expected)
  const before = await state(page)
  await page.waitForTimeout(450)
  const after = await state(page)
  assert.equal(after.renderCount, before.renderCount, `${expected}: no repeating GPU draws`)
  return { before, after }
}

async function geometry(page) {
  return page.getByTestId('specimen-inspector').evaluate(root => {
    const clipped = [], controls = []
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const r = e.getBoundingClientRect()
      if (!r.width || !r.height) continue
      if (r.left < -1 || r.right > innerWidth + 1) clipped.push({ tag: e.tagName, left: r.left, right: r.right })
      if (e.matches('button,input,a')) controls.push({ text: e.textContent.trim() || e.getAttribute('aria-label'), height: r.height, disabled: !!e.disabled })
    }
    return { clipped, controls, filterBarDisplay: getComputedStyle(root.querySelector('.specimen-form-controls')).display, viewport: { width: innerWidth, height: innerHeight } }
  })
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()
  async function run(name, options, action) {
    if (selected && !selected.includes(name)) return
    const { record = false, failWebGL = false, ...contextOptions } = options
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...contextOptions, ...(record ? { recordVideo: { dir: path.join(out, 'recordings'), size: contextOptions.viewport || { width: 1440, height: 1000 } } } : {}) })
    const requests = [], errors = []
    await context.route('**/api/**', route => {
      requests.push({ method: route.request().method(), url: route.request().url() })
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Specimen QA blocks all backend access' }) })
    })
    if (failWebGL) await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return String(type).startsWith('webgl') ? null : original.call(this, type, ...args) }
    })
    const page = await context.newPage()
    page.setDefaultTimeout(12000)
    page.on('pageerror', error => errors.push(error.message))
    const video = page.video()
    try {
      await ready(page)
      const result = await action(page)
      assert.deepEqual(requests, [], 'Isolated study made no API requests')
      assert.deepEqual(errors, [], 'No uncaught browser errors')
      report.checks.push({ name, passed: true, apiRequests: requests, browserErrors: errors, ...result })
      console.log('PASS', name)
    } catch (error) {
      await page.screenshot({ path: path.join(out, `${name}-failure.png`) }).catch(() => {})
      report.failures.push({ name, message: error.stack, apiRequests: requests, browserErrors: errors })
      console.error('FAIL', name, error.message)
    } finally {
      await context.close()
      if (video) {
        const original = await video.path()
        const destination = path.join(out, 'recordings', `${name}.webm`)
        fs.renameSync(original, destination)
        report.recordings.push({ name, file: path.relative(out, destination), bytes: fs.statSync(destination).size, sha256: hash(fs.readFileSync(destination)) })
      }
      save()
    }
  }
  try {
    for (const [width, height] of [[1440, 1000], [1024, 768], [768, 1024], [390, 844], [320, 568]]) {
      await run(`layout-${width}`, { viewport: { width, height }, hasTouch: width < 500, record: width === 1440 || width === 390 }, async page => {
        const canvas = page.locator('.specimen-chamber canvas')
        assert.equal((await state(page)).renderer, 'webgl')
        await freezeProof(page, 'idle')
        const macro = await canvas.screenshot({ path: path.join(out, `${width}-macro.png`) })
        await page.getByTestId('specimen-inspector').screenshot({ path: path.join(out, `${width}-workbench-macro.png`) })
        await page.evaluate(() => { window.__specimenCanvas = document.querySelector('.specimen-chamber canvas') })
        await page.getByRole('button', { name: 'UV view', exact: true }).click()
        await page.waitForFunction(() => Number(document.querySelector('.specimen-chamber canvas')?.dataset.inspection) > .05)
        const transition = await state(page)
        assert.equal(transition.transition, 'scanning')
        if (width === 1440 || width === 390) await canvas.screenshot({ path: path.join(out, `${width}-scan.png`) })
        await settled(page)
        await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
        await canvas.scrollIntoViewIfNeeded()
        await freezeProof(page, 'paused')
        const uv = await canvas.screenshot({ path: path.join(out, `${width}-uv.png`) })
        assert.notEqual(hash(uv), hash(macro))
        assert.equal(await page.evaluate(() => window.__specimenCanvas === document.querySelector('.specimen-chamber canvas')), true, 'Same real canvas during mode change')
        assert.equal(await page.getByRole('button', { name: 'UV view', exact: true }).getAttribute('aria-pressed'), 'true')
        const slider = page.getByRole('slider', { name: 'Rotate specimen', exact: true })
        await slider.focus(); await slider.press('Home')
        for (let i = 0; i < 12; i++) await slider.press('ArrowRight')
        await canvas.scrollIntoViewIfNeeded()
        await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.renderedAngle === '-120.00')
        const rotated = await canvas.screenshot({ path: path.join(out, `${width}-rotated.png`) })
        assert.notEqual(hash(rotated), hash(uv), 'True geometry rotation changes the canvas')
        await page.getByRole('button', { name: 'Reset angle', exact: true }).click()
        if (width === 1440) {
          await canvas.scrollIntoViewIfNeeded()
          const bounds = await canvas.boundingBox()
          await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
          await page.mouse.down()
          await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2, { steps: 10 })
          await page.mouse.up()
          await page.waitForFunction(() => Number(document.querySelector('.specimen-chamber canvas')?.dataset.renderedAngle) >= 45)
          await page.getByRole('button', { name: 'Reset angle', exact: true }).click()
        }
        await page.getByTestId('specimen-inspector').getByRole('button', { name: 'Fibers', exact: true }).click()
        await canvas.scrollIntoViewIfNeeded()
        await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.form === 'fibers')
        const fibers = await state(page)
        assert.equal(Number(fibers.visibleForms), 9)
        await page.getByTestId('specimen-inspector').getByRole('button', { name: 'Fragments', exact: true }).click()
        await canvas.scrollIntoViewIfNeeded()
        await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.form === 'fragments')
        const fragments = await state(page)
        assert.equal(Number(fragments.visibleForms), 17)
        await page.getByTestId('specimen-inspector').getByRole('button', { name: 'All forms', exact: true }).click()
        await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.form === 'all')
        const hoverColors = await page.getByTestId('specimen-inspector').getByRole('button', { name: 'All forms', exact: true }).evaluate(e => ({ color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor }))
        const luminance = color => {
          const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
          return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
        }
        const colorL = luminance(hoverColors.color), backgroundL = luminance(hoverColors.background)
        const contrast = (Math.max(colorL, backgroundL) + .05) / (Math.min(colorL, backgroundL) + .05)
        assert(contrast >= 4.5, 'Selected control hover remains readable')
        await page.getByTestId('specimen-inspector').screenshot({ path: path.join(out, `${width}-workbench-uv.png`) })
        assert.doesNotMatch(await page.getByTestId('specimen-inspector').innerText(), /240,?000|90%/)
        const layout = await geometry(page)
        assert.deepEqual(layout.clipped, [])
        assert.equal(layout.filterBarDisplay, 'flex', 'Final control-bar CSS is served')
        assert(layout.controls.every(c => c.height >= 44), '44px controls')
        return { transition, fibers, fragments, geometry: layout, selectedHover: { ...hoverColors, contrast }, hashes: { macro: hash(macro), uv: hash(uv), rotated: hash(rotated) } }
      })
    }
    await run('lifecycle', {}, async page => {
      const canvas = page.locator('.specimen-chamber canvas')
      await page.getByRole('button', { name: 'UV view', exact: true }).click(); await settled(page)
      await page.getByRole('button', { name: 'Scan again' }).click()
      await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.transition === 'scanning')
      await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
      await canvas.scrollIntoViewIfNeeded()
      const scanPaused = await freezeProof(page, 'paused')
      assert(Number(scanPaused.after.scanProgress) < 1, 'Pause freezes the scan before completion')
      await page.getByRole('button', { name: 'Resume motion', exact: true }).click()
      await settled(page)
      await canvas.scrollIntoViewIfNeeded()
      const before = Number((await state(page)).renderCount)
      await page.waitForTimeout(300)
      assert(Number((await state(page)).renderCount) > before)
      await page.locator('#particle-atlas').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
      const offscreen = await freezeProof(page, 'offscreen')
      await canvas.scrollIntoViewIfNeeded()
      await page.waitForFunction(old => Number(document.querySelector('.specimen-chamber canvas')?.dataset.renderCount) > old, Number(offscreen.after.renderCount))
      await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
      await page.locator('#particle-atlas').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await canvas.scrollIntoViewIfNeeded()
      const paused = await freezeProof(page, 'paused')
      await page.getByRole('button', { name: 'Resume motion', exact: true }).click()
      await canvas.scrollIntoViewIfNeeded()
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
      const hidden = await freezeProof(page, 'offscreen')
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
      await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.running === 'true')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const reduced = await freezeProof(page, 'reduced-motion')
      return { scanPaused, offscreen, paused, hidden, reduced, visibilityMethod: 'Synthetic document.hidden and visibilitychange; not native tab backgrounding' }
    })
    await run('reduced-motion', { reducedMotion: 'reduce' }, async page => {
      await page.getByRole('button', { name: 'UV view', exact: true }).click()
      await page.locator('.specimen-chamber canvas').scrollIntoViewIfNeeded()
      const frozen = await freezeProof(page, 'reduced-motion')
      assert.equal(frozen.after.inspection, '1.000')
      assert.equal(frozen.after.transition, 'settled')
      assert.equal(await page.getByRole('button', { name: 'Scan again' }).isDisabled(), true)
      assert.equal(await page.getByRole('slider', { name: 'Rotate specimen', exact: true }).isEnabled(), true)
      return frozen
    })
    for (const mode of ['unavailable', 'context-loss']) await run(`fallback-${mode}`, { failWebGL: mode === 'unavailable' }, async page => {
      if (mode === 'context-loss') await page.locator('.specimen-chamber canvas').evaluate(canvas => { window.__lostSpecimen = canvas; canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext() })
      await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.renderer === '2d-fallback')
      await page.getByRole('button', { name: 'UV view', exact: true }).click()
      await page.locator('.specimen-chamber canvas').scrollIntoViewIfNeeded()
      assert.equal(await page.getByRole('slider', { name: 'Rotate specimen', exact: true }).isDisabled(), true)
      await page.getByTestId('specimen-inspector').getByRole('button', { name: 'Fibers', exact: true }).click()
      await page.locator('.specimen-chamber canvas').scrollIntoViewIfNeeded()
      const result = await state(page)
      assert.equal(result.form, 'fibers'); assert.equal(result.running, 'false')
      if (mode === 'context-loss') assert.equal(await page.evaluate(() => window.__lostSpecimen.dataset.disposed), 'true')
      await page.getByTestId('specimen-inspector').screenshot({ path: path.join(out, `fallback-${mode}.png`) })
      return { result, disabled3DRotation: true }
    })
  } finally { await browser.close(); report.success = report.failures.length === 0; report.completedAt = new Date().toISOString(); save() }
  if (!report.success) process.exitCode = 1
})().catch(error => { report.failures.push({ error: error.stack }); save(); console.error(error); process.exitCode = 1 })
