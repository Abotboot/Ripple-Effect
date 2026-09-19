/* eslint-disable @typescript-eslint/no-require-imports -- Published-preview browser verification. */
'use strict'
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const base = new URL(process.env.QA_DEPLOY_URL || 'https://deploy-preview-2--rippleeffecter.netlify.app/motion-study')
if (base.protocol !== 'https:' || base.username || base.password ||
    !/^(?:deploy-preview-2|[a-f0-9]{24})--rippleeffecter\.netlify\.app$/.test(base.hostname)) {
  throw new Error('Use the existing Ripple Effect preview or its observed deploy permalink')
}
const output = path.resolve('docs/qa/phase-c/deployed')
fs.mkdirSync(output, { recursive: true })
const report = { createdAt: new Date().toISOString(), url: base.href,
  expectedCommit: process.env.QA_EXPECTED_COMMIT || null,
  success: false, checks: [] }
const save = () => fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n')

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500, serviceWorkers: 'block' })
      const page = await context.newPage()
      page.setDefaultTimeout(25000)
      const errors = [], api = []
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url()) })
      await context.route('**/api/**', route => route.abort())
      await context.addInitScript(() => {
        window.__deployedJourney = { end: null, boundary: null, canvas: null, seeks: 0 }
        document.addEventListener('seeking', event => {
          if (event.target instanceof HTMLVideoElement) window.__deployedJourney.seeks++
        }, true)
        document.addEventListener('ended', event => {
          if (!(event.target instanceof HTMLVideoElement)) return
          const video = event.target, capture = document.createElement('canvas')
          capture.width = video.videoWidth; capture.height = video.videoHeight
          capture.getContext('2d').drawImage(video, 0, 0)
          window.__deployedJourney.end = { trusted: event.isTrusted, time: video.currentTime,
            duration: video.duration, rate: video.playbackRate, png: capture.toDataURL('image/png').split(',')[1] }
        }, true)
        new MutationObserver(() => {
          const hero = document.querySelector('[data-testid="ripple-hero"]')
          const canvas = document.querySelector('[data-testid="artwork-field"]')
          if (hero?.dataset.state === 'entering' && canvas && !window.__deployedJourney.boundary) {
            window.__deployedJourney.canvas = canvas
            window.__deployedJourney.boundary = { entrance: Number(canvas.dataset.entrance),
              png: canvas.toDataURL('image/png').split(',')[1] }
          }
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-state'] })
      })
      try {
        const response = await page.goto(base.href, { waitUntil: 'domcontentloaded' })
        assert.equal(response.status(), 200)
        await page.waitForFunction(() => document.querySelector('[data-testid="particle-stage"]')?.dataset.renderer === 'interactive-artwork')
        await page.getByTestId('journey-watch').click()
        await page.waitForFunction(() => document.querySelector('video')?.currentTime > .2)
        const video = await page.locator('video').evaluate(element => ({ src: element.currentSrc, duration: element.duration }))
        assert.equal(video.duration, 5)
        assert(new URL(video.src).pathname.endsWith('/live/microscope-original.mp4'))
        await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
        assert.equal(await page.locator('video').count(), 0)
        const evidence = await page.evaluate(() => ({ ...window.__deployedJourney, canvas: undefined,
          sameCanvas: window.__deployedJourney.canvas === document.querySelector('[data-testid="artwork-field"]') }))
        assert(evidence.end?.trusted && evidence.sameCanvas)
        assert.equal(evidence.seeks, 0)
        assert.equal(evidence.end.duration, 5)
        assert.equal(evidence.end.rate, 1)
        assert.equal(evidence.boundary?.entrance, 0)
        for (const [name, item] of [['video-end', evidence.end], ['canvas-boundary', evidence.boundary]]) {
          const png = Buffer.from(item.png, 'base64')
          const rgb = await sharp(png).removeAlpha().raw().toBuffer()
          assert(rgb.every(channel => channel === 0), 'Published video and initial canvas must both be optical black')
          fs.writeFileSync(path.join(output, `${width}-${name}.png`), png)
          delete item.png
        }
        await page.getByTestId('field-pause').click()
        assert.equal(await page.getByTestId('field-pause').getAttribute('aria-pressed'), 'true')
        const categories = []
        for (const category of ['all', 'fibers', 'fragments', 'granules']) {
          await page.getByTestId('field-' + category).click()
          await page.getByTestId('artwork-field').scrollIntoViewIfNeeded()
          await page.waitForFunction(value => document.querySelector('[data-testid="artwork-field"]')?.dataset.category === value, category)
          await page.waitForTimeout(180)
          await page.screenshot({ path: path.join(output, `${width}-${category}.png`) })
          categories.push(category)
        }
        const state = () => page.getByTestId('artwork-field').evaluate(canvas => ({
          draws: canvas.dataset.draws, time: canvas.dataset.fieldTime, running: canvas.dataset.running }))
        const before = await state()
        await page.waitForTimeout(600)
        assert.deepEqual(await state(), before)
        assert.equal(before.running, 'false')
        const drawerCount = await page.locator('iframe[title="Netlify Drawer"]').count()
        assert.equal(drawerCount, 0, 'The injected review toolbar must not obstruct this preview')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
        assert.deepEqual(api, [])
        assert.deepEqual(errors, [], 'Include console errors, not only uncaught JavaScript exceptions')
        report.checks.push({ width, height, passed: true, http: response.status(), video, evidence,
          categories, paused: before, drawerCount, apiRequests: api.length, errors })
        console.log('PASS deployed', width, height)
      } catch (error) {
        report.checks.push({ width, height, passed: false, error: error.stack, errors, api })
        await page.screenshot({ path: path.join(output, `${width}-failure.png`) }).catch(() => {})
        console.error('FAIL deployed', width, error.message)
      } finally { await context.close(); save() }
    }
  } finally {
    await browser.close()
    report.success = report.checks.length === 2 && report.checks.every(check => check.passed)
    report.completedAt = new Date().toISOString(); save()
    if (!report.success) process.exitCode = 1
  }
}
main().catch(error => { console.error(error); save(); process.exitCode = 1 })
