/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local browser acceptance review. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const out = __dirname
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const selectedCases = process.env.SPECIMEN_QA_CASES?.split(',')
const report = { createdAt: new Date().toISOString(), base, selectedCases: selectedCases || 'all', checks: [], failures: [], recordings: [], success: false }
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex')
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2))
const scope = page => page.getByTestId('specimen-inspector')
const detail = page => page.getByTestId('specimen-detail-canvas')
const photo = page => scope(page).locator('.specimen-photo-target img')
const state = page => detail(page).evaluate(c => ({ ...c.dataset, width: c.width, height: c.height }))
const show = async page => { await detail(page).scrollIntoViewIfNeeded(); await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]')?.dataset.rendered) }
const settled = page => page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]')?.dataset.transition === 'settled')
const shot = (locator, name) => locator.screenshot({ path: path.join(out, `${name}.png`) })

async function imageEvidence(page) {
  const evidence = await photo(page).evaluate(image => {
    const source = document.createElement('canvas')
    source.width = image.naturalWidth; source.height = image.naturalHeight
    source.getContext('2d').drawImage(image, 0, 0)
    const style = getComputedStyle(image)
    const rect = image.getBoundingClientRect()
    return { pixels: source.toDataURL(), src: image.currentSrc, photoDOM: image.parentElement.outerHTML, style: { filter: style.filter, opacity: style.opacity, transform: style.transform, blend: style.mixBlendMode }, bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }
  })
  const { pixels, ...details } = evidence
  return { ...details, decodedImageSHA256: hash(pixels) }
}

async function load(page) {
  await page.goto(base + '/motion-study', { waitUntil: 'domcontentloaded' })
  await photo(page).scrollIntoViewIfNeeded()
  await photo(page).evaluate(image => image.decode())
  await page.evaluate(() => document.fonts.ready)
  await show(page)
}
async function freeze(page) {
  const button = page.getByTestId('specimen-pause')
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click()
  await show(page)
  await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.running === 'false')
}
async function stable(page) {
  const before = await state(page)
  await page.waitForTimeout(420)
  const after = await state(page)
  assert.equal(after.renderCount, before.renderCount, 'No repeated Canvas draws while suspended')
  assert.equal(after.scanProgress, before.scanProgress, 'Scan clock stays frozen')
  return { before, after }
}

;(async () => {
  // Use only after the prime releases the browser slot. All contexts are
  // sequential, and this single browser is closed in the outer finally.
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()
  async function run(name, options, work) {
    if (selectedCases && !selectedCases.includes(name)) return
    const { recording = false, ...contextOptions } = options
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions, ...(recording ? { recordVideo: { dir: path.join(out, 'recordings'), size: contextOptions.viewport || { width: 1440, height: 900 } } } : {}) })
    const api = [], responses = [], errors = []
    await context.route('**/api/**', async route => { api.push(route.request().url()); await route.abort() })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => { if (response.url().includes('/media/ripple/specimen/')) responses.push({ url: response.url(), status: response.status() }) })
    try {
      const result = await work(page, context)
      assert.deepEqual(api, [], 'Motion study made no backend requests')
      assert.deepEqual(errors, [], 'No unhandled browser errors')
      report.checks.push({ name, passed: true, apiRequests: api, responses, ...result })
      console.log('PASS', name)
    } catch (error) {
      report.failures.push({ name, error: error.stack, apiRequests: api, errors, responses })
      await page.screenshot({ path: path.join(out, `${name}-failure.png`) }).catch(() => {})
      console.error('FAIL', name, error.message)
    } finally {
      const video = page.video()
      await context.close()
      if (video) {
        const destination = path.join(out, 'recordings', `${name}.webm`)
        await video.saveAs(destination); await video.delete()
        const bytes = fs.readFileSync(destination)
        report.recordings.push({ name, file: path.relative(out, destination), bytes: bytes.length, sha256: hash(bytes), timing: 'Unedited interaction recording; no acceleration' })
      }
      save()
    }
  }
  try {
    for (const [width, height] of [[1440,900], [1024,768], [768,1024], [390,844], [320,568]]) {
      await run(`layout-${width}`, { viewport: { width, height }, hasTouch: width < 500, recording: width === 1440 || width === 390 }, async page => {
        await load(page)
        assert.equal(await scope(page).getByRole('slider', { name: 'Rotate specimen' }).count(), 0, 'No false 3D rotation control')
        assert.equal(await scope(page).locator('.specimen-overview canvas').count(), 0, 'No full-bottle particle layer')
        assert.equal(await photo(page).getAttribute('loading'), 'lazy')
        assert.equal(new URL(await photo(page).getAttribute('src'), base).pathname, '/media/ripple/specimen/retail-pet-clean.webp')
        const initial = await state(page)
        assert.equal(initial.renderer, 'photo-canvas')
        assert.equal(initial.rendered, 'macro')
        assert.equal(initial.visibleForms, '0')
        const macro = await shot(detail(page), `${width}-detail-shoulder`)
        await shot(scope(page), `${width}-workbench-macro`)
        await scope(page).getByRole('button', { name: 'Ribs', exact: true }).click()
        await show(page)
        await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.position?.endsWith('0.780'))
        const ribs = await shot(detail(page), `${width}-detail-ribs`)
        assert.notEqual(hash(macro), hash(ribs), 'A different bottle region changes the actual image detail')
        await scope(page).getByRole('button', { name: '4×', exact: true }).click()
        await show(page)
        await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.zoom === '4')
        const zoomed = await shot(detail(page), `${width}-detail-enlarged`)
        assert.notEqual(hash(ribs), hash(zoomed), 'Image enlargement changes the source crop')
        const slider = scope(page).getByRole('slider', { name: 'Detail position' })
        await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight')
        assert.equal(await slider.inputValue(), '17', 'Position slider supports keyboard input')
        await scope(page).getByRole('button', { name: 'Shoulder', exact: true }).click()
        await scope(page).getByRole('button', { name: '3×', exact: true }).click()
        await show(page)
        await shot(photo(page), `${width}-whole-bottle`)
        const before = await imageEvidence(page)
        await page.getByTestId('specimen-uv').click()
        await show(page)
        await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.rendered === 'uv')
        await page.waitForTimeout(360)
        await shot(detail(page), `${width}-reveal`)
        await settled(page)
        await freeze(page)
        const uv = await shot(detail(page), `${width}-detail-uv`)
        await shot(photo(page), `${width}-whole-bottle-after-uv`)
        const after = await imageEvidence(page)
        assert.equal(after.decodedImageSHA256, before.decodedImageSHA256, 'UV uses the identical decoded full-bottle image')
        assert.equal(after.photoDOM, before.photoDOM, 'UV adds no layer or marks to the full-bottle view')
        assert.deepEqual(after.style, before.style, 'UV does not filter, fade or transform the full-bottle image')
        assert.notEqual(hash(macro), hash(uv), 'Illustrative detail visibly differs from the photo crop')
        await scope(page).getByRole('button', { name: 'Fibers', exact: true }).click()
        await show(page)
        await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.form === 'fibers')
        const fibers = await shot(detail(page), `${width}-detail-fibers`)
        assert.notEqual(hash(fibers), hash(uv), 'Form filter affects the rendered marks')
        assert(Number((await state(page)).visibleForms) < 16)
        await scope(page).getByRole('button', { name: 'All forms', exact: true }).click()
        await show(page); await shot(scope(page), `${width}-workbench-uv`)
        const geometry = await scope(page).evaluate(root => {
          const overflow = [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1) }).map(e => e.className)
          const controls = [...root.querySelectorAll('button,input,a')].map(e => ({ name: e.getAttribute('aria-label') || e.textContent.trim(), height: e.getBoundingClientRect().height }))
          return { overflow, controls, width: innerWidth, height: innerHeight }
        })
        assert.deepEqual(geometry.overflow, [])
        assert(geometry.controls.every(control => control.height >= 44), 'Controls have at least 44px target height')
        assert.match(await scope(page).innerText(), /not a material test|not spectrometry or a material test/i)
        assert.doesNotMatch(await scope(page).innerText(), /240,?000/)
        return { initial, final: await state(page), geometry, wholeBottleUnchanged: true, wholeBottleEvidence: { before, after }, hashes: { macro: hash(macro), ribs: hash(ribs), zoomed: hash(zoomed), uv: hash(uv), fibers: hash(fibers) } }
      })
    }

    await run('lifecycle', {}, async page => {
      await load(page)
      await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.running === 'false')
      const idle = await stable(page)
      await page.getByTestId('specimen-uv').click(); await show(page); await settled(page)
      await page.getByTestId('specimen-scan').click()
      await page.waitForTimeout(140); await freeze(page)
      const scanPaused = await stable(page)
      await page.locator('#particle-atlas-title').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.motion === 'offscreen')
      const offscreen = await stable(page)
      await show(page)
      assert.equal(await page.getByTestId('specimen-pause').getAttribute('aria-pressed'), 'true', 'Manual pause survives re-entry')
      await page.getByTestId('specimen-pause').click()
      await page.waitForTimeout(240)
      assert(Number((await state(page)).renderCount) > Number(offscreen.after.renderCount), 'Motion resumes only after explicit resume')
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
      const hidden = await stable(page)
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.running === 'false')
      const reduced = await stable(page)
      return { idle, scanPaused, offscreen, hidden, reduced, visibilityMethod: 'Synthetic document.hidden and visibilitychange, not native background-tab emulation' }
    })

    await run('reduced-at-load', { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }, async page => {
      await load(page); await page.getByTestId('specimen-uv').click(); await show(page); await settled(page)
      assert.equal(await page.getByTestId('specimen-pause').isDisabled(), true)
      assert.equal(await page.getByTestId('specimen-scan').isDisabled(), true)
      await scope(page).getByRole('button', { name: 'Fragments', exact: true }).click(); await show(page)
      await page.waitForFunction(() => document.querySelector('[data-testid="specimen-detail-canvas"]').dataset.running === 'false')
      const frozen = await stable(page)
      await shot(scope(page), 'reduced-at-load')
      return { frozen }
    })

    await run('image-failure-and-retry', {}, async (page, context) => {
      const pattern = '**/media/ripple/specimen/retail-pet-clean.webp*'
      await context.route(pattern, route => route.abort())
      await page.goto(base + '/motion-study')
      await scope(page).scrollIntoViewIfNeeded()
      await scope(page).getByRole('button', { name: 'Retry image', exact: true }).waitFor()
      assert.match(await scope(page).innerText(), /Bottle image unavailable/)
      await shot(scope(page), 'image-failure')
      await context.unroute(pattern)
      await scope(page).getByRole('button', { name: 'Retry image', exact: true }).click()
      await photo(page).scrollIntoViewIfNeeded(); await photo(page).evaluate(i => i.decode())
      await show(page)
      assert.equal((await state(page)).rendered, 'macro')
      return { recovered: true }
    })

    await run('canvas-unavailable', { viewport: { width: 390, height: 844 } }, async page => {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (...args) { return this.dataset.testid === 'specimen-detail-canvas' ? null : original.apply(this, args) }
      })
      await page.goto(base + '/motion-study')
      await photo(page).scrollIntoViewIfNeeded(); await photo(page).evaluate(i => i.decode())
      await detail(page).scrollIntoViewIfNeeded()
      await scope(page).getByText('Interactive detail is unavailable.', { exact: false }).waitFor()
      assert.equal(await scope(page).getByRole('slider', { name: 'Detail position' }).isDisabled(), true)
      assert.equal(await photo(page).isVisible(), true)
      await shot(scope(page), 'canvas-unavailable')
      return { fullPhotoAvailable: true, falseRotationControl: false }
    })
  } finally {
    await browser.close()
    report.success = report.failures.length === 0
    report.completedAt = new Date().toISOString()
    report.sourceHashes = ['src/components/atmosphere/specimen-inspector.tsx', 'src/components/atmosphere/specimen-inspector.css', 'src/components/atmosphere/bottle-scene.ts', 'public/media/ripple/specimen/retail-pet-clean.webp'].map(file => ({ file, sha256: hash(fs.readFileSync(file)) }))
    save()
  }
  if (!report.success) process.exitCode = 1
})().catch(error => { report.failures.push({ error: error.stack }); save(); console.error(error); process.exitCode = 1 })
