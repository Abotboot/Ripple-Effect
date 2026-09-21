/* eslint-disable @typescript-eslint/no-require-imports -- Local browser regression. */
const assert = require('node:assert/strict')
const { loadPlaywright } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')
const base = process.env.QA_BASE_URL || 'http://localhost:3000'

async function response(page, scene) {
  await scene.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => [...document.querySelectorAll('[data-motion=true]')].length > 0)
  const box = await scene.boundingBox()
  await page.mouse.move(box.x + box.width * .57, box.y + box.height * .42, { steps: 20 })
  await page.waitForTimeout(400)
  return scene.locator('[data-particle]').evaluateAll(nodes => nodes.some(node => {
    const push = Math.hypot(parseFloat(node.style.getPropertyValue('--push-x')) || 0, parseFloat(node.style.getPropertyValue('--push-y')) || 0)
    return push > .1 && getComputedStyle(node).translate !== 'none'
  }))
}

;(async () => {
  const checks = []
  for (const engine of ['chromium', 'webkit']) {
    const browser = await loadPlaywright()[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE } : {}) })
    try {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const width = engine === 'chromium' ? 3440 : 1920
        const context = await browser.newContext({ viewport: { width, height: 1080 }, reducedMotion })
        await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
        const page = await context.newPage()
        const media = []
        page.on('request', request => { if (/\.(mp4|webm)(\?|$)/.test(request.url())) media.push(request.url()) })
        await page.goto(base, { waitUntil: 'networkidle' })
        assert.equal(await page.locator('video,[data-testid="journey-entry-cover"],[data-testid="journey-watch"]').count(), 0)
        assert.equal(media.length, 0)
        assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).position === 'fixed'), false)
        assert.equal(await page.locator('body').innerText().then(text => text.includes('—')), false)
        const hero = page.getByTestId('hero-cutout-scene')
        await page.waitForFunction(() => document.querySelector('[data-testid="hero-cutout-scene"]')?.getAttribute('data-motion') === 'true')
        assert.equal(await page.getByTestId('field-pause').innerText(), 'Pause motion')
        assert.equal(await response(page, hero), true, `${engine}: hero reacts (${reducedMotion})`)
        const image = hero.locator('img').first()
        assert.equal(await image.getAttribute('draggable'), 'false')
        assert.equal(await image.evaluate(node => getComputedStyle(node).userSelect || getComputedStyle(node).webkitUserSelect), 'none')
        await page.evaluate(() => { window.__particleDrags = 0; document.addEventListener('dragstart', () => window.__particleDrags++) })
        const bounds = await hero.boundingBox()
        await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .4)
        await page.mouse.down()
        await page.mouse.move(bounds.x + bounds.width * .85, bounds.y + bounds.height * .6, { steps: 15 })
        await page.mouse.up()
        assert.equal(await page.evaluate(() => window.__particleDrags), 0)
        // Search inputs overlay the scene, but pointer movement must still reach it.
        const input = page.locator('.tank-search input').first()
        await input.hover()
        await page.waitForTimeout(350)
        assert.equal(await hero.locator('[data-particle]').evaluateAll(nodes => nodes.some(node => Math.abs(parseFloat(node.style.getPropertyValue('--push-x'))) > .1)), true)
        const atlas = page.getByTestId('particle-atlas')
        await atlas.scrollIntoViewIfNeeded()
        for (const id of ['fibers', 'fragments', 'granules']) {
          const card = page.locator(`#atlas-tab-${id}`)
          assert.equal(await response(page, card.getByTestId('photo-cutout-scene')), true, `${engine}: ${id} reacts (${reducedMotion})`)
          await card.click()
          assert.equal(await card.getAttribute('aria-selected'), 'true')
        }
        await atlas.getByRole('button', { name: 'Pause motion', exact: true }).click()
        assert.equal(await atlas.locator('[data-motion=true]').count(), 0)
        checks.push(`${engine} ${width}px ${reducedMotion}: starts moving, no native image drag/selection, hero/search/all cards respond, selection and pause work`)
        await context.close()
      }
      const context = await browser.newContext({ viewport: { width: 414, height: 896 }, isMobile: true, hasTouch: true })
      await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
      const page = await context.newPage()
      await page.goto(base, { waitUntil: 'networkidle' })
      assert.equal(await page.locator('video,[data-testid="journey-entry-cover"],[data-testid="journey-watch"]').count(), 0)
      await page.locator('#atlas-tab-granules').tap()
      assert.equal(await page.locator('#atlas-tab-granules').getAttribute('aria-selected'), 'true')
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      assert.equal(await page.evaluate(() => window.scrollY), 0)
      checks.push(`${engine} mobile: direct homepage, card selection, return scroll`)
      await context.close()
    } finally { await browser.close() }
  }
  console.log(JSON.stringify({ passed: true, checks }, null, 2))
})().catch(error => { console.error(error); process.exitCode = 1 })
