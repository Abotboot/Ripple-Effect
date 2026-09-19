/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser acceptance harness. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { sequence } = require('../../src/lib/ripple-asset-manifest.json')
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const out = path.resolve(process.env.QA_OUTPUT || 'docs/qa/phase-b/browser')
const only = process.env.QA_ONLY?.split(',')
const label = process.env.QA_RUN_LABEL || 'results'
fs.mkdirSync(out, { recursive: true })
const report = { base, createdAt: new Date().toISOString(), success: false, filter: only || null, checks: [], requests: [], errors: [], recordings: [] }
const views = [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 568]]
const assets = ['particle-world-master', 'fibers-card', 'fragments-card', 'granules-card', 'sample-study-panel']
const testId = (page, id) => page.getByTestId(id)
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const saveReport = () => fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(report, null, 2))

async function ready(page, route = '/motion-study') {
  await page.goto(base + route, { waitUntil: 'domcontentloaded' })
  await testId(page, 'journey-watch').waitFor()
  await page.waitForFunction(() => document.querySelector('[data-testid="journey-watch"]')?.disabled === false)
  await page.evaluate(() => document.fonts.ready)
}

async function geometry(page) {
  return page.evaluate(() => {
    const rect = id => {
      const r = document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect()
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null
    }
    const a = rect('journey-watch'), b = rect('journey-skip-idle')
    const overlap = a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)) : 0
    return { media: rect('ripple-media'), stage: rect('particle-stage'), video: rect('journey-video'), viewport: { width: innerWidth, height: innerHeight }, scrollY, overflow: document.documentElement.scrollWidth > innerWidth + 1, overlap }
  })
}

// This must stay a real Watch activation: no harness stage scroll after it.
async function start(page, touch = false) {
  if (touch) await testId(page, 'journey-watch').tap()
  else await testId(page, 'journey-watch').click()
  await page.waitForFunction(() => (document.querySelector('[data-testid="journey-video"]')?.currentTime || 0) > .2, null, { timeout: 12000 })
  const g = await geometry(page)
  assert(g.video.y >= -1, 'Watch brings the top of the stage into view')
  const visibleHeight = Math.min(g.video.bottom, g.viewport.height) - Math.max(g.video.y, 0)
  assert(visibleHeight >= Math.min(g.video.height, g.viewport.height) - 2, 'Watch shows the available stage without harness scrolling')
  for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(g.video[key] - g.stage[key]) < 1, `${key}: video and static layer aligned`)
  for (const id of ['journey-skip', 'journey-pause']) {
    const r = await testId(page, id).boundingBox()
    assert(r.y >= 0 && r.y + r.height <= g.viewport.height, `${id} remains visible`)
    assert(r.height >= 44, `${id} touch target`)
    assert.equal(await testId(page, id).evaluate(element => {
      const box = element.getBoundingClientRect()
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
    }), true, `${id} is not obscured before any control autoscroll`)
  }
  return g
}

async function skipped(page) {
  await testId(page, 'journey-skip').click()
  await testId(page, 'journey-watch').waitFor()
  assert.equal(await page.locator('video').count(), 0)
  assert.equal(await page.locator('#study-search').evaluate(e => e === document.activeElement), true)
  const bounds = await page.locator('#study-search').boundingBox()
  assert(bounds.y >= -1 && bounds.y + bounds.height <= await page.evaluate(() => innerHeight) + 1, 'Handoff focus is visible')
}

async function staticTerminal(page) {
  assert.equal(await testId(page, 'particle-stage').getAttribute('data-renderer'), 'terminal-static-proof')
  const source = new URL(await testId(page, 'hero-artwork').getAttribute('src'), base)
  assert.equal(source.pathname, sequence.terminalPoster)
  assert.equal(source.search, '', 'Exact terminal path has no image transformation query')
  assert.equal(await testId(page, 'hero-artwork').getAttribute('loading'), 'eager')
  assert.equal(await testId(page, 'hero-artwork').getAttribute('srcset'), null, 'Exact terminal image is not transformed by next/image')
  await testId(page, 'hero-artwork').evaluate(i => i.decode())
  assert.equal(await testId(page, 'particle-stage').locator('canvas').count(), 0, 'Hero remains a static fallback')
}

// Passive browser instrumentation. It records natural events and controller
// media-time cues; it never seeks, accelerates, or dispatches an ended event.
async function instrument(context) {
  await context.addInitScript(() => {
    const seen = new WeakSet()
    const revealed = new WeakSet()
    window.__phaseB = { videos: [], events: [], reveals: [] }
    const observe = () => {
      for (const video of document.querySelectorAll('[data-testid="journey-video"]')) {
        if (seen.has(video)) continue
        seen.add(video)
        window.__phaseB.videos.push(video)
        const id = window.__phaseB.videos.length
        for (const type of ['playing', 'pause', 'waiting', 'ended', 'error', 'seeking', 'ratechange']) {
          video.addEventListener(type, event => window.__phaseB.events.push({ id, type, time: video.currentTime, duration: Number.isFinite(video.duration) ? video.duration : null, rate: video.playbackRate, wallMs: performance.now(), trusted: event.isTrusted }), true)
        }
      }
    }
    new MutationObserver(mutations => {
      observe()
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.oldValue !== 'true' || !mutation.target.classList?.contains('ripple-editorial')) continue
        if (mutation.target.getAttribute('aria-hidden') === 'true') continue
        const video = document.querySelector('[data-testid="journey-video"]')
        if (video && !revealed.has(video)) {
          revealed.add(video)
          window.__phaseB.reveals.push({ currentTime: video.currentTime, cueMediaTime: Number(video.dataset.mediaTime), wallMs: performance.now(), presentedFrameCallback: typeof video.requestVideoFrameCallback === 'function' })
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['aria-hidden'] })
  })
}

async function waitForTime(page, time) {
  await page.waitForFunction(t => (document.querySelector('[data-testid="journey-video"]')?.currentTime || 0) >= t, time, { timeout: 15000 })
}

async function naturalJourney(page, stem, touch = false) {
  await ready(page)
  await testId(page, 'hero-artwork').evaluate(i => i.decode())
  await page.waitForTimeout(350)
  const initial = await geometry(page)
  const playing = await start(page, touch)
  assert.equal(await page.locator('.ripple-editorial').getAttribute('aria-hidden'), 'true')
  assert.equal(await page.locator('.ripple-editorial').evaluate(e => e.inert), true)
  await waitForTime(page, 1.2)
  await page.screenshot({ path: path.join(out, `${stem}-microscope.png`) })
  await waitForTime(page, 5)
  await page.screenshot({ path: path.join(out, `${stem}-continuation.png`) })
  await waitForTime(page, 7.7)
  await page.screenshot({ path: path.join(out, `${stem}-reveal.png`) })
  await testId(page, 'journey-watch').waitFor({ timeout: 15000 })
  await staticTerminal(page)
  const evidence = await page.evaluate(() => ({ events: window.__phaseB.events, reveals: window.__phaseB.reveals, videos: window.__phaseB.videos.map(v => ({ connected: v.isConnected, paused: v.paused, source: v.getAttribute('src') })) }))
  fs.writeFileSync(path.join(out, `${stem}-media-events.json`), JSON.stringify(evidence, null, 2))
  const ended = evidence.events.filter(e => e.type === 'ended')
  assert.equal(ended.length, 1, 'Exactly one natural ended handoff')
  assert.equal(ended[0].trusted, true)
  assert(ended[0].time >= sequence.terminalFramePTS)
  assert(Math.abs(ended[0].duration - sequence.durationSeconds) < .1)
  assert(evidence.events.every(e => e.rate === 1), 'Normal playback rate throughout')
  assert.equal(evidence.events.filter(e => e.type === 'seeking').length, 0, 'No seeking')
  const began = evidence.events.find(e => e.type === 'playing')
  assert(ended[0].wallMs - began.wallMs >= sequence.durationSeconds * 850, 'Journey ran at normal speed')
  assert(evidence.reveals.length > 0, 'Media-clock reveal observed')
  // Presented frame time may lead currentTime slightly. Check the clock the
  // controller actually used, without treating those clocks as interchangeable.
  assert(evidence.reveals.every(e => e.cueMediaTime >= 7.5 && (e.presentedFrameCallback || e.currentTime >= 7.5)), `Reveal before its media cue: ${JSON.stringify(evidence.reveals)}`)
  assert(evidence.videos.every(v => !v.connected && v.paused && v.source === null), 'Finished video released')
  await page.screenshot({ path: path.join(out, `${stem}-handoff.png`) })
  await page.waitForTimeout(650)
  return { initial, playing, ...evidence }
}

async function interactions(page, stem) {
  await page.locator('#study-search').click()
  await page.locator('#study-search').pressSequentially('60614', { delay: 130 })
  await page.locator('#study-search').press('Enter')
  assert.match(await page.locator('#search').innerText(), /Input preserved: “60614”/)
  await page.locator('#search').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(out, `${stem}-search.png`) })
  await page.waitForTimeout(700)
  await page.locator('#particle-atlas-title').scrollIntoViewIfNeeded()
  const atlas = page.locator('section[aria-labelledby="particle-atlas-title"]')
  for (const name of ['fibers-card', 'fragments-card', 'granules-card']) {
    const image = atlas.locator(`img[src*="${name}"]`)
    await image.scrollIntoViewIfNeeded()
    await image.evaluate(i => i.decode())
    await page.waitForTimeout(450)
  }
  await atlas.locator('a[href="#specimen-study"]').click()
  assert.equal(new URL(page.url()).hash, '#specimen-study')
  const canvas = page.locator('.specimen-chamber canvas')
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.rendered === 'macro')
  const macro = await canvas.screenshot({ path: path.join(out, `${stem}-specimen-macro.png`) })
  await page.getByRole('button', { name: 'UV view', exact: true }).click()
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.rendered === 'uv')
  assert.equal(await page.getByRole('button', { name: 'UV view', exact: true }).getAttribute('aria-pressed'), 'true')
  const uv = await canvas.screenshot({ path: path.join(out, `${stem}-specimen-uv.png`) })
  assert.notEqual(hash(macro), hash(uv), 'Specimen pixels change when the lens changes')
  await page.waitForTimeout(650)
  const slider = page.getByRole('slider', { name: 'Rotate specimen' })
  await slider.focus()
  await slider.press('Home')
  for (let i = 0; i < 12; i++) await slider.press('ArrowRight', { delay: 50 })
  assert.equal(await slider.inputValue(), '-120')
  await page.waitForFunction(() => document.querySelector('.specimen-chamber canvas')?.dataset.angle === '-120')
  await canvas.scrollIntoViewIfNeeded()
  const rotated = await canvas.screenshot({ path: path.join(out, `${stem}-specimen-rotated.png`) })
  assert.notEqual(hash(uv), hash(rotated), 'Specimen pixels change with rotation')
  const specimen = await canvas.evaluate(c => ({ renderer: c.dataset.renderer || '2d-fallback', mode: c.dataset.rendered, angle: c.dataset.angle, width: c.width, height: c.height }))
  await page.waitForTimeout(650)
  const sample = page.locator('.sample-examination-art img')
  await sample.scrollIntoViewIfNeeded()
  await sample.evaluate(i => i.decode())
  await page.screenshot({ path: path.join(out, `${stem}-sample.png`) })
  await page.waitForTimeout(700)
  return { searchInput: '60614', searchResult: 'Isolated HTML interaction preview; no data request', atlasInteraction: 'Scrolled three static illustrated cards and activated its specimen anchor', specimen, canvasSHA256: { macro: hash(macro), uv: hash(uv), rotated: hash(rotated) } }
}

;(async () => {
  // All contexts are sequential and share this single browser instance.
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()
  async function run(name, options, verify) {
    if (only && !only.some(part => name.includes(part))) return
    const { width = 1440, height = 900, recording, mockedHome = false, ...contextOptions } = options
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500, serviceWorkers: 'block', ...contextOptions, ...(recording ? { recordVideo: { dir: path.join(out, 'recordings'), size: { width, height } } } : {}) })
    await instrument(context)
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    const errors = [], api = [], responses = [], requests = [], failedRequests = [], intercepted = []
    if (mockedHome) await context.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url())
      intercepted.push({ url: request.url(), method: request.method() })
      const emptyStats = { utilitiesCount: 0, contaminantsCount: 0, samplesCount: 0, reportsCount: 0, volunteersCount: 0, chaptersCount: 0, donationsCount: 0, donationsTotal: 0, statesCovered: 0, populationServed: 0, microplasticsAvg: null, healthExceedances: 0, legalExceedances: 0, trackedByUsCount: 0, qualityCounts: { verified: 0, provisional: 0, citizen: 0 }, mapUtilities: [] }
      const fixtures = { '/api/stats': emptyStats, '/api/utilities': [], '/api/utilities/scores': { scores: [] }, '/api/utilities/recent': { utilities: [] }, '/api/activity': { items: [], counts: { samples: 0, reports: 0, chapters: 0, donations: 0 } }, '/api/readings/recent': { items: [] }, '/api/auth/me': { user: null } }
      const allowed = request.method() === 'GET' && Object.hasOwn(fixtures, url.pathname)
      // Never continue an API route, including unknown endpoints or writes.
      await route.fulfill({ status: allowed ? 200 : 503, contentType: 'application/json', body: JSON.stringify(allowed ? fixtures[url.pathname] : { error: 'QA intercept: no backend request permitted' }) })
    })
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      requests.push(request.url())
      if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url())
    })
    page.on('response', response => { if (/media%2Fripple|\/media\/ripple/.test(response.url())) responses.push({ url: response.url(), status: response.status() }) })
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), reason: request.failure()?.errorText }))
    try {
      const details = await verify(page, context, { api, responses, requests, intercepted })
      assert.deepEqual(errors, [], 'No uncaught browser errors')
      if (mockedHome) {
        assert.equal(intercepted.length, api.length, 'Every homepage API request was intercepted')
        assert(intercepted.every(request => request.method === 'GET'), 'No homepage write attempted')
      } else assert.deepEqual(api, [], 'The isolated study makes no API requests')
      report.checks.push({ name, passed: true, viewport: { width, height }, apiRequests: api.length, apiPolicy: mockedHome ? 'Every API request fulfilled with empty QA fixtures; no backend traffic' : 'Zero API requests', ...details })
      console.log('PASS', name)
    } catch (error) {
      report.checks.push({ name, passed: false, error: error.stack, browserErrors: errors, apiRequests: api })
      report.errors.push({ name, error: error.stack })
      await page.screenshot({ path: path.join(out, `failure-${name.replace(/[^a-z0-9]+/gi, '-')}.png`) }).catch(() => {})
      console.error('FAIL', name, error.message)
    } finally {
      report.requests.push({ name, responses, failedRequests, api, intercepted })
      const video = page.video()
      await context.close()
      if (video && recording) {
        const destination = path.join(out, 'recordings', `${recording}.webm`)
        await video.saveAs(destination)
        await video.delete()
        report.recordings.push({ name, file: path.relative(out, destination), bytes: fs.statSync(destination).size, sha256: hash(fs.readFileSync(destination)), timing: 'Unedited Playwright recording; playback rate 1, natural ended event' })
      }
      saveReport()
    }
  }
  try {
    for (const [width, height] of views) await run(`layout-assets-skip-${width}x${height}`, { width, height }, async (page, _context, network) => {
      await ready(page)
      await testId(page, 'hero-artwork').evaluate(i => i.decode())
      const before = await geometry(page)
      assert.equal(before.overflow, false, 'No horizontal overflow')
      assert.equal(before.overlap, 0, 'Watch and Skip do not overlap')
      assert(Math.abs(before.media.width / before.media.height - 16 / 9) < .01)
      assert.equal(await page.locator('video').count(), 0, 'No automatic video')
      assert.equal(network.requests.filter(url => url.includes('.mp4')).length, 0, 'No video fetch before Watch')
      await page.screenshot({ path: path.join(out, `${width}-poster.png`) })
      for (const name of assets.slice(1)) {
        const image = page.locator(`img[src*="${name}"]`).first()
        assert.equal(await image.getAttribute('loading'), 'lazy')
        await image.scrollIntoViewIfNeeded()
        await image.evaluate(i => i.decode())
      }
      await page.locator('#particle-atlas-title').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(out, `${width}-atlas.png`) })
      await page.locator('.sample-examination-art').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(out, `${width}-sample.png`) })
      for (const name of assets) assert(network.responses.some(r => r.url.includes(name) && r.status === 200), `Actual served image: ${name}`)
      // Start from below the hero, the failure hidden by the previous harness.
      const during = await start(page, width < 500)
      await page.screenshot({ path: path.join(out, `${width}-watch.png`) })
      await skipped(page)
      await staticTerminal(page)
      assert.equal((await geometry(page)).overflow, false)
      return { before, during, allFiveAssetsServed: true, watchHarnessScroll: false }
    })

    for (const [width, height, stem] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) await run(`normal-journey-interactions-${stem}`, { width, height, recording: `${stem}-journey-and-interactions`, isMobile: width < 500 }, async (page, _context, network) => {
      const journey = await naturalJourney(page, stem, width < 500)
      const interaction = await interactions(page, stem)
      for (const name of assets) assert(network.responses.some(r => r.url.includes(name) && r.status === 200), `Recording includes served asset ${name}`)
      return { journey, interaction, allFiveAssetsServed: true }
    })

    for (const [width, height] of [[1440, 900], [390, 844]]) await run(`mocked-home-${width}x${height}`, { width, height, mockedHome: true }, async (page, _context, network) => {
      await ready(page, '/')
      await testId(page, 'hero-artwork').evaluate(i => i.decode())
      await page.locator('#tank-search-input').fill('60614')
      assert.equal(await page.evaluate(() => Boolean(document.querySelector('#search').compareDocumentPosition(document.querySelector('section[aria-labelledby="particle-atlas-title"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, 'Atlas follows real search in the DOM')
      assert.equal(await page.locator('#sample-study .sample-examination-art').count(), 1, 'Sample anchor resolves')
      for (const name of assets.slice(1)) {
        const image = page.locator(`img[src*="${name}"]`).first()
        await image.scrollIntoViewIfNeeded()
        await image.evaluate(i => i.decode())
      }
      for (const name of assets) assert(network.responses.some(r => r.url.includes(name) && r.status === 200), `Homepage actual served image: ${name}`)
      const during = await start(page, width < 500)
      await page.screenshot({ path: path.join(out, `mocked-home-${width}-watch.png`) })
      await testId(page, 'journey-skip').click()
      await testId(page, 'journey-watch').waitFor()
      assert.equal(await page.locator('#tank-search-input').inputValue(), '60614')
      assert.equal(await page.locator('#tank-search-input').evaluate(e => e === document.activeElement), true)
      await staticTerminal(page)
      const search = page.waitForRequest(request => new URL(request.url()).pathname === '/api/utilities' && new URL(request.url()).searchParams.get('q') === '60614')
      await page.locator('#tank-search-input').press('Enter')
      const request = await search
      assert.equal(request.method(), 'GET')
      await page.getByRole('heading', { name: 'Results for "60614"' }).waitFor()
      await page.locator('#search').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(out, `mocked-home-${width}-search.png`) })
      return { during, allFiveAssetsServed: true, realFormInputPreserved: true, utilitiesSearch: { method: request.method(), url: request.url(), response: 'Intercepted empty array; no data claim' } }
    })

    await run('keyboard-pause-media-clock-offscreen', {}, async page => {
      await ready(page)
      await page.locator('#study-search').fill('60614')
      await testId(page, 'journey-watch').focus()
      await page.keyboard.press('Enter')
      await waitForTime(page, .3)
      assert.equal(await testId(page, 'journey-skip').evaluate(e => e === document.activeElement), true)
      await page.keyboard.press('Tab')
      assert.equal(await testId(page, 'journey-pause').evaluate(e => e === document.activeElement), true)
      assert.notEqual(await testId(page, 'journey-pause').evaluate(e => getComputedStyle(e).outlineStyle), 'none')
      await page.keyboard.press('Space')
      assert.equal(await testId(page, 'journey-pause').getAttribute('aria-pressed'), 'true')
      const time = await page.locator('video').evaluate(v => v.currentTime)
      // Longer than the reveal wall time: an actual pause must not reveal text.
      await page.waitForTimeout(7800)
      assert(Math.abs(await page.locator('video').evaluate(v => v.currentTime) - time) < .05)
      assert.equal(await page.locator('.ripple-editorial').getAttribute('aria-hidden'), 'true')
      await page.locator('#particle-atlas-title').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await page.waitForFunction(() => document.querySelector('video').getBoundingClientRect().bottom <= 0)
      await page.waitForTimeout(150)
      await testId(page, 'ripple-media').scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      assert.equal(await page.locator('video').evaluate(v => v.paused), true, 'Manual pause survives leaving/reentering the viewport')
      await testId(page, 'journey-pause').click()
      await waitForTime(page, time + .3)
      await page.locator('#particle-atlas-title').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
      await page.waitForFunction(() => document.querySelector('video').getBoundingClientRect().bottom <= 0)
      await page.waitForFunction(() => document.querySelector('video')?.paused === true)
      const offscreenTime = await page.locator('video').evaluate(v => v.currentTime)
      await page.waitForTimeout(500)
      assert(Math.abs(await page.locator('video').evaluate(v => v.currentTime) - offscreenTime) < .05)
      await testId(page, 'ripple-media').scrollIntoViewIfNeeded()
      await waitForTime(page, offscreenTime + .3)
      await page.keyboard.press('Escape')
      await testId(page, 'journey-watch').waitFor()
      assert.equal(await page.locator('#study-search').inputValue(), '60614')
      assert.equal(await page.locator('#study-search').evaluate(e => e === document.activeElement), true)
      return { pausedSeconds: 7.8, pausedMediaTime: time, offscreenTime, manualPausePreserved: true, typedInputPreserved: true }
    })

    await run('superseded-play-rejection-and-cleanup', {}, async page => {
      await ready(page)
      await start(page)
      await testId(page, 'journey-pause').click()
      await page.evaluate(() => {
        const original = HTMLMediaElement.prototype.play
        let deferred = false
        HTMLMediaElement.prototype.play = function () {
          if (!deferred) { deferred = true; return new Promise((_resolve, reject) => { window.__rejectOldPlay = () => reject(new DOMException('Superseded play', 'AbortError')) }) }
          return original.call(this)
        }
      })
      await testId(page, 'journey-pause').click()
      await testId(page, 'journey-pause').click()
      await testId(page, 'journey-pause').click()
      await page.waitForFunction(() => document.querySelector('video')?.paused === false)
      await page.evaluate(() => window.__rejectOldPlay())
      const time = await page.locator('video').evaluate(v => v.currentTime)
      await waitForTime(page, time + .4)
      assert.equal(await testId(page, 'cinematic-intro').getAttribute('data-state'), 'playing')
      await skipped(page)
      await page.waitForTimeout(300)
      const retained = await page.evaluate(() => window.__phaseB.videos.map(v => ({ connected: v.isConnected, paused: v.paused, source: v.getAttribute('src') })))
      assert(retained.every(v => !v.connected && v.paused && v.source === null))
      return { supersededRejectionIgnored: true, retained }
    })

    await run('visibility-and-reduced-motion-change', {}, async page => {
      await ready(page)
      await start(page)
      // Headless visibility is explicitly simulated; viewport suspension above
      // is tested by genuine scrolling and IntersectionObserver notifications.
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
      const time = await page.locator('video').evaluate(v => v.currentTime)
      await page.waitForTimeout(350)
      assert.equal(await page.locator('video').evaluate(v => v.paused), true)
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
      await waitForTime(page, time + .2)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await testId(page, 'journey-watch').waitFor()
      assert.equal(await page.locator('video').count(), 0)
      await testId(page, 'journey-watch').click()
      assert.equal(await page.locator('video').count(), 0)
      return { documentVisibility: 'Simulated hidden getter plus visibilitychange event', reducedMotionChange: 'Playwright media emulation; playback released, replay bypassed' }
    })

    for (const mode of ['blocked-storage', 'play-rejected', 'late-play', 'media-failed', 'timeupdate-fallback', 'reduced-at-load', 'returning-session', 'deep-link', 'master-poster-failed', 'terminal-poster-failed', 'video-poster-failed', 'media-and-terminal-failed']) await run(mode, { width: 390, height: 844, reducedMotion: mode === 'reduced-at-load' ? 'reduce' : 'no-preference' }, async page => {
      if (mode === 'blocked-storage') await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }) })
      if (mode === 'play-rejected') await page.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('Blocked', 'NotAllowedError')) } })
      if (mode === 'late-play') await page.addInitScript(() => { const original = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { return new Promise((resolve, reject) => setTimeout(() => original.call(this).then(resolve, reject), 800)) } })
      if (mode === 'timeupdate-fallback') await page.addInitScript(() => { HTMLVideoElement.prototype.requestVideoFrameCallback = undefined; HTMLVideoElement.prototype.cancelVideoFrameCallback = undefined })
      if (mode === 'returning-session') await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'))
      if (['media-failed', 'media-and-terminal-failed'].includes(mode)) await page.route('**/media/ripple/*.mp4', route => route.abort())
      if (mode === 'master-poster-failed') await page.route('**/*particle-world-master*', route => route.abort())
      if (['terminal-poster-failed', 'media-and-terminal-failed'].includes(mode)) await page.route('**/media/ripple/continuation-terminal-proof.webp', route => route.abort())
      if (mode === 'video-poster-failed') await page.route('**/media/ripple/microscope-poster.webp', route => route.abort())
      await ready(page, mode === 'deep-link' ? '/motion-study#search' : '/motion-study')
      if (['reduced-at-load', 'returning-session', 'deep-link'].includes(mode)) {
        assert.equal(await page.locator('video').count(), 0)
        assert.equal(await page.locator('#study-search').evaluate(e => e === document.activeElement), false, 'Bypass does not steal focus')
        if (mode === 'reduced-at-load') { await testId(page, 'journey-watch').click(); assert.equal(await page.locator('video').count(), 0) }
      } else if (mode === 'timeupdate-fallback') {
        const journey = await naturalJourney(page, 'timeupdate-fallback')
        assert(journey.reveals.every(e => !e.presentedFrameCallback))
        return { fallback: 'timeupdate media clock, not presented-frame synchronization', journey }
      } else {
        if (mode === 'master-poster-failed') {
          await testId(page, 'hero-artwork-unavailable').waitFor()
          assert.match(await testId(page, 'journey-proof-status').innerText(), /Artwork unavailable/)
        }
        await testId(page, 'journey-watch').click()
        if (mode === 'late-play') { await skipped(page); await page.waitForTimeout(1100) }
        else if (['play-rejected', 'media-failed', 'media-and-terminal-failed'].includes(mode)) {
          await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'home')
          assert.match(await testId(page, 'journey-proof-status').innerText(), /Playback unavailable/)
        } else { await waitForTime(page, .3); await skipped(page) }
        assert.equal(await page.locator('video').count(), 0)
        if (['terminal-poster-failed', 'media-and-terminal-failed'].includes(mode)) {
          await testId(page, 'hero-artwork-unavailable').waitFor()
          assert.match(await testId(page, 'journey-proof-status').innerText(), /Final frame unavailable/)
          assert.doesNotMatch(await testId(page, 'journey-proof-status').innerText(), /exact final video frame/)
          assert.equal(await testId(page, 'particle-stage').getAttribute('data-renderer'), 'unavailable')
        } else await staticTerminal(page)
        const retained = await page.evaluate(() => window.__phaseB.videos.map(v => ({ connected: v.isConnected, paused: v.paused, source: v.getAttribute('src') })))
        assert(retained.every(v => !v.connected && v.paused && v.source === null))
      }
      await page.locator('#study-search').fill('Austin')
      await page.locator('#study-search').press('Enter')
      assert.match(await page.locator('#search').innerText(), /Input preserved: “Austin”/)
      await page.screenshot({ path: path.join(out, `${mode}.png`) })
      return { noAutomaticVideo: ['reduced-at-load', 'returning-session', 'deep-link'].includes(mode), searchUsable: true }
    })
  } finally {
    report.success = report.errors.length === 0
    report.completedAt = new Date().toISOString()
    saveReport()
    await browser.close()
  }
  if (!report.success) process.exitCode = 1
})().catch(error => { console.error(error); report.success = false; report.errors.push({ error: error.stack }); saveReport(); process.exitCode = 1 })
