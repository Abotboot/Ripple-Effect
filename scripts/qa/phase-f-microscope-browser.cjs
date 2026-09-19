/* eslint-disable @typescript-eslint/no-require-imports -- Installed-browser intro QA only. */
'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const sharp = require('sharp')
const { createJiti } = require('jiti')
const { ROOT, contained, sha256, loadPlaywright, writeFile } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')

const jiti = createJiti(__filename, { tryNative: false, fsCache: path.join(ROOT, 'node_modules/.cache/jiti') })
const { artworkJourney } = jiti(path.join(ROOT, 'src/lib/artwork-journey.ts'))
const base = new URL(process.env.QA_BASE_URL || 'http://localhost:3020')
if (base.origin !== 'http://localhost:3020') throw Error('Phase F intro QA uses the existing localhost:3020 server only')

const out = contained(ROOT, 'docs/qa/phase-f/microscope/browser')
fs.mkdirSync(out, { recursive: true })
const supplement = process.argv.includes('--supplement')
if (!supplement) for (const entry of fs.readdirSync(out)) fs.rmSync(contained(out, entry), { recursive: true, force: true, maxRetries: 2 })

const artworkImages = ['particle-world-master', 'fibers-card', 'fragments-card', 'granules-card', 'sample-study-panel']
const openingFile = path.join(ROOT, 'public', artworkJourney.poster)
const terminalFile = path.join(ROOT, 'public', artworkJourney.terminalPoster)
const existingReport = supplement && fs.existsSync(path.join(out, 'results.json'))
  ? JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'))
  : null
const report = existingReport ?? {
  phase: 'F-authoritative-intro',
  worker: 'worker-5',
  base: base.origin,
  registry: artworkJourney,
  mediaHashes: {
    video: sha256(fs.readFileSync(path.join(ROOT, 'public', artworkJourney.src))),
    opening: sha256(fs.readFileSync(openingFile)),
    terminal: sha256(fs.readFileSync(terminalFile)),
  },
  sourceHashes: Object.fromEntries([
    'src/lib/artwork-journey.ts',
    'src/components/atmosphere/cinematic-intro.tsx',
    'src/components/atmosphere/cinematic-intro.css',
    'src/components/atmosphere/tank-hero.tsx',
  ].map(file => [file, sha256(fs.readFileSync(path.join(ROOT, file)))])),
  checks: [],
  passed: false,
  browserClosed: false,
}
report.sourceHashes = Object.fromEntries([
  'src/lib/artwork-journey.ts',
  'src/components/atmosphere/cinematic-intro.tsx',
  'src/components/atmosphere/cinematic-intro.css',
  'src/components/atmosphere/tank-hero.tsx',
].map(file => [file, sha256(fs.readFileSync(path.join(ROOT, file)))]))
report.browserClosed = false
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n')
const upsertCheck = check => {
  const index = report.checks.findIndex(existing => existing.name === check.name)
  if (index >= 0) report.checks[index] = check
  else report.checks.push(check)
}
const id = (page, name) => page.getByTestId(name)
const closeEnough = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance
const sameRect = (a, b, tolerance = 1) => ['x', 'y', 'width', 'height'].every(key => closeEnough(a[key], b[key], tolerance))
const box = r => ({ x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom })
function run(command, args, timeout = 90000) {
  const result = spawnSync(command, args, { cwd: ROOT, windowsHide: true, timeout, maxBuffer: 128 * 1024 * 1024 })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stderr?.toString() || `${command} failed`)
  return result.stdout
}
const averageDelta = (a, b) => {
  assert.equal(a.length, b.length)
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length
}
async function analyzeHandoffRecording(file, width, height, recordingStartEpoch, boundaries) {
  const compareWidth = 160
  const compareHeight = Math.max(90, Math.round(compareWidth * height / width))
  const fit = async source => sharp(source)
    .resize(width, height, { fit: 'contain', background: { r: 2, g: 4, b: 3 } })
    .resize(compareWidth, compareHeight, { fit: 'fill' })
    .removeAlpha().raw().toBuffer()
  const [opening, terminal] = await Promise.all([fit(openingFile), fit(terminalFile)])
  const frameBytes = compareWidth * compareHeight * 3
  const analyses = []
  for (const boundary of boundaries) {
    const expected = Math.max(0, (boundary.epoch - recordingStartEpoch) / 1000)
    const start = Math.max(0, expected - .15)
    const raw = run('ffmpeg', [
      '-v', 'error', '-ss', start.toFixed(6), '-i', file, '-t', '0.45',
      '-vf', `fps=30,scale=${compareWidth}:${compareHeight}:flags=bilinear`,
      '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ])
    assert(raw.length >= frameBytes * 5 && raw.length % frameBytes === 0, 'Could not decode the handoff recording window')
    const frames = []
    for (let offset = 0, index = 0; offset < raw.length; offset += frameBytes, index++) {
      const pixels = raw.subarray(offset, offset + frameBytes)
      frames.push({
        index,
        approximateSeconds: start + index / 30,
        openingMAD: averageDelta(pixels, opening),
        terminalMAD: averageDelta(pixels, terminal),
      })
    }
    const openingLike = frames.filter(frame => frame.openingMAD < 20 && frame.openingMAD + 8 < frame.terminalMAD)
    assert.deepEqual(openingLike, [], `${boundary.label} recording window contains a frame that resembles opening-v4/frame0 after native end`)
    analyses.push({ ...boundary, expectedRecordingSeconds: expected, windowStartSeconds: start, frames, openingLikeCount: openingLike.length })
  }
  return analyses
}

async function instrument(context) {
  await context.addInitScript(() => {
    const events = []
    const sources = new Set()
    const frames = []
    const visibility = [{ hidden: document.hidden, state: document.visibilityState, wall: performance.now() }]
    const destructive = []
    window.__introQA = {
      events,
      sources: [],
      frames,
      visibility,
      destructive,
      nativeEndedSeen: false,
      nativeEndedCount: 0,
      video: null,
      boundary: null,
      boundaryCanvas: null,
      videoEnd: null,
      videoEndRect: null,
    }
    const destructiveSnapshot = (video, kind) => ({
      kind,
      epoch: Date.now(),
      isConnected: video.isConnected,
      ended: video.ended,
      currentTime: video.currentTime,
      poster: video.poster,
      src: video.getAttribute('src'),
      currentSrc: video.currentSrc,
      heroState: document.querySelector('[data-testid="ripple-hero"]')?.dataset.state ?? null,
      afterEnded: window.__introQA.nativeEndedSeen,
      endedCount: window.__introQA.nativeEndedCount,
    })
    const nativeLoad = HTMLMediaElement.prototype.load
    HTMLMediaElement.prototype.load = function (...args) {
      if (this instanceof HTMLVideoElement && this.matches('[data-testid="journey-video"]')) destructive.push(destructiveSnapshot(this, 'load'))
      return nativeLoad.apply(this, args)
    }
    const nativeRemoveAttribute = Element.prototype.removeAttribute
    Element.prototype.removeAttribute = function (name) {
      if (name === 'src' && this instanceof HTMLVideoElement && this.matches('[data-testid="journey-video"]')) {
        destructive.push(destructiveSnapshot(this, 'remove-src'))
      }
      return nativeRemoveAttribute.call(this, name)
    }
    document.addEventListener('visibilitychange', () => {
      visibility.push({ hidden: document.hidden, state: document.visibilityState, wall: performance.now() })
    })
    const snapshot = (v, type, trusted) => ({
      type,
      trusted,
      wall: performance.now(),
      epoch: Date.now(),
      time: v.currentTime,
      duration: Number.isFinite(v.duration) ? v.duration : null,
      rate: v.playbackRate,
      paused: v.paused,
      readyState: v.readyState,
      networkState: v.networkState,
      error: v.error?.code ?? null,
      width: v.videoWidth,
      height: v.videoHeight,
    })
    for (const type of ['loadedmetadata', 'loadeddata', 'canplay', 'play', 'playing', 'waiting', 'stalled', 'pause', 'ended', 'error', 'seeking', 'timeupdate']) {
      document.addEventListener(type, event => {
        const v = event.target
        if (!(v instanceof HTMLVideoElement) || !v.matches('[data-testid="journey-video"]')) return
        if (type === 'ended') {
          window.__introQA.nativeEndedSeen = true
          window.__introQA.nativeEndedCount++
        }
        if (v.currentSrc) sources.add(v.currentSrc)
        window.__introQA.sources = [...sources]
        if (events.length < 250) events.push(snapshot(v, type, event.isTrusted))
        if (type === 'ended') {
          const r = v.getBoundingClientRect()
          window.__introQA.videoEndRect = { x: r.x, y: r.y, width: r.width, height: r.height }
          const c = document.createElement('canvas')
          c.width = v.videoWidth
          c.height = v.videoHeight
          c.getContext('2d').drawImage(v, 0, 0)
          window.__introQA.videoEnd = c.toDataURL('image/png').split(',')[1]
          c.width = c.height = 0
        }
        if (type === 'playing') {
          window.__introQA.video = v
          const frame = (_now, metadata) => {
            if (frames.length < 300) frames.push({ time: metadata.mediaTime, presented: metadata.presentedFrames })
            if (v.isConnected && !v.ended) v.requestVideoFrameCallback?.(frame)
          }
          v.requestVideoFrameCallback?.(frame)
        }
      }, true)
    }
    new MutationObserver(() => {
      const hero = document.querySelector('[data-testid="ripple-hero"]')
      const canvas = document.querySelector('[data-testid="artwork-field"]')
      const media = document.querySelector('[data-testid="ripple-media"]')
      const image = document.querySelector('[data-testid="hero-artwork"]')
      if (hero?.dataset.state === 'entering' && canvas && media && image && !window.__introQA.boundary) {
        const cr = canvas.getBoundingClientRect()
        const mr = media.getBoundingClientRect()
        const ir = image.getBoundingClientRect()
        window.__introQA.boundaryCanvas = canvas
        window.__introQA.boundary = {
          entrance: Number(canvas.dataset.entrance),
          time: Number(canvas.dataset.fieldTime),
          mediaRect: { x: mr.x, y: mr.y, width: mr.width, height: mr.height },
          canvasRect: { x: cr.x, y: cr.y, width: cr.width, height: cr.height },
          stageRect: { x: ir.x, y: ir.y, width: ir.width, height: ir.height },
          stageSrc: image.currentSrc,
          stageObjectFit: getComputedStyle(image).objectFit,
          canvasOpacity: Number(getComputedStyle(canvas).opacity),
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-state'] })
  })
}

async function isolateApis(context, log) {
  await context.route('**/api/**', route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    log.push({ method: request.method(), pathname })
    const fixtures = {
      '/api/stats': null,
      '/api/utilities/scores': { scores: [] },
      '/api/utilities/recent': { utilities: [] },
      '/api/activity': { items: [] },
      '/api/readings/recent': { items: [] },
      '/api/auth/me': { user: null },
    }
    const fixture = fixtures[pathname]
    return route.fulfill({
      status: fixture === undefined ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture ?? { error: 'QA fixture isolation' }),
    })
  })
}

function observePage(page, mediaRequests, mediaResponses, imageResponses, openingResponses, errors) {
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    const url = request.url()
    if (new URL(url).pathname === artworkJourney.src) mediaRequests.push({ url, method: request.method() })
  })
  page.on('response', response => {
    const url = response.url()
    const pathname = new URL(url).pathname
    if (pathname === artworkJourney.src) mediaResponses.push({
      url,
      status: response.status(),
      acceptRanges: response.headers()['accept-ranges'],
      contentType: response.headers()['content-type'],
    })
    if (pathname === artworkJourney.poster) openingResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] })
    const asset = artworkImages.find(name => decodeURIComponent(url).includes(name))
    if (asset) imageResponses.push({ asset, url, status: response.status(), contentType: response.headers()['content-type'] })
  })
}

async function coverState(page) {
  return page.evaluate(() => {
    const cover = document.querySelector('[data-testid="journey-entry-cover"]')
    const image = document.querySelector('[data-testid="journey-entry-image"]')
    const enter = document.querySelector('[data-testid="journey-enter"]')
    const skip = document.querySelector('[data-testid="journey-cover-skip"]')
    const rect = element => {
      const r = element.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const painted = element => {
      if (!element) return false
      const style = getComputedStyle(element)
      const r = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && r.width > 0 && r.height > 0
    }
    const skipRect = rect(skip)
    const skipHit = document.elementFromPoint(skipRect.x + skipRect.width / 2, skipRect.y + skipRect.height / 2)
    return {
      viewport: { width: innerWidth, height: innerHeight },
      coverRect: rect(cover),
      imageRect: rect(image),
      imageSrc: new URL(image.currentSrc, location.href).pathname,
      imageNatural: { width: image.naturalWidth, height: image.naturalHeight },
      imageObjectFit: getComputedStyle(image).objectFit,
      enterRect: rect(enter),
      skipRect,
      skipHit: Boolean(skipHit && skip.contains(skipHit)),
      enterFocused: document.activeElement === enter,
      bodyOverflow: document.body.style.overflow,
      cinematicClass: document.body.classList.contains('ripple-cinematic-active'),
      backgroundInert: Boolean(document.querySelector('.site-header')?.inert || document.querySelector('.ripple-media')?.inert),
      siteHeaderPainted: painted(document.querySelector('.site-header')),
      searchShortcutPainted: painted(document.querySelector('button[aria-label="Open search (Cmd+K)"]')),
      scrollTopPainted: painted(document.querySelector('button[aria-label="Scroll to top"]')),
      videoCount: document.querySelectorAll('video').length,
      oldTransportCount: document.querySelectorAll('.ripple-player-controls,[data-testid="journey-progress"],[data-testid="journey-time"],[data-testid="journey-pause"],[data-testid="journey-restart"],[data-testid="journey-skip"]').length,
      canvasRunning: document.querySelector('[data-testid="artwork-field"]')?.dataset.running ?? null,
      canvasDraws: Number(document.querySelector('[data-testid="artwork-field"]')?.dataset.draws ?? 0),
    }
  })
}

async function playbackGeometry(page) {
  return page.evaluate(() => {
    const video = document.querySelector('[data-testid="journey-video"]')
    const media = document.querySelector('[data-testid="ripple-media"]')
    const rect = element => {
      const r = element.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const vr = rect(video)
    const scale = Math.min(vr.width / video.videoWidth, vr.height / video.videoHeight)
    const content = {
      x: vr.x + (vr.width - video.videoWidth * scale) / 2,
      y: vr.y + (vr.height - video.videoHeight * scale) / 2,
      width: video.videoWidth * scale,
      height: video.videoHeight * scale,
    }
    const painted = element => {
      if (!element) return false
      const style = getComputedStyle(element)
      const r = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && r.width > 0 && r.height > 0
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      mediaRect: rect(media),
      videoRect: vr,
      content,
      objectFit: getComputedStyle(video).objectFit,
      bodyOverflow: document.body.style.overflow,
      cinematicClass: document.body.classList.contains('ripple-cinematic-active'),
      backgroundInert: Boolean(document.querySelector('.site-header')?.inert && document.querySelector('.ripple-editorial')?.inert),
      siteHeaderPainted: painted(document.querySelector('.site-header')),
      searchShortcutPainted: painted(document.querySelector('button[aria-label="Open search (Cmd+K)"]')),
      scrollTopPainted: painted(document.querySelector('button[aria-label="Scroll to top"]')),
      oldTransportCount: document.querySelectorAll('.ripple-player-controls,[data-testid="journey-progress"],[data-testid="journey-time"],[data-testid="journey-pause"],[data-testid="journey-restart"],[data-testid="journey-skip"],[data-testid="journey-proof-status"]').length,
      coverCount: document.querySelectorAll('[data-testid="journey-entry-cover"]').length,
    }
  })
}

async function assertFiveArtworkImages(page, imageResponses) {
  await id(page, 'particle-atlas').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await page.locator('#sample-study').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  const decoded = await page.evaluate(names => names.map(name => {
    const image = [...document.images].find(img => decodeURIComponent(img.currentSrc || img.src).includes(name))
    return { name, found: Boolean(image), complete: Boolean(image?.complete), naturalWidth: image?.naturalWidth ?? 0, src: image?.currentSrc || image?.src || null }
  }), artworkImages)
  assert(decoded.every(item => item.found && item.complete && item.naturalWidth > 0), 'All five artwork images must decode in the page')
  const network = artworkImages.map(asset => ({ asset, responses: imageResponses.filter(response => response.asset === asset) }))
  assert(network.every(item => item.responses.some(response => response.status === 200)), 'All five artwork requests must return HTTP 200')
  return { decoded, network }
}

async function normalJourney(browser, width, height) {
  const name = `normal-${width}x${height}`
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 500,
    isMobile: width < 500,
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
    recordVideo: { dir: out, size: { width, height } },
  })
  await instrument(context)
  const api = [], mediaRequests = [], mediaResponses = [], imageResponses = [], openingResponses = [], errors = []
  await isolateApis(context, api)
  const recordingStartEpoch = Date.now()
  const page = await context.newPage()
  page.setDefaultTimeout(25000)
  observePage(page, mediaRequests, mediaResponses, imageResponses, openingResponses, errors)
  const result = { name, width, height, passed: false }
  try {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-entry-cover').waitFor()
    await page.waitForTimeout(500)
    result.cover = await coverState(page)
    result.preEnterMediaRequests = mediaRequests.length
    assert.equal(mediaRequests.length, 0, 'First visit must not request the MP4 before Enter')
    assert.equal(result.cover.videoCount, 0, 'First visit cover must not mount a video')
    assert.equal(result.cover.imageSrc, artworkJourney.poster)
    assert.deepEqual(result.cover.imageNatural, { width: artworkJourney.width, height: artworkJourney.height })
    assert.equal(result.cover.imageObjectFit, 'contain')
    assert(result.cover.enterFocused, 'Enter should receive initial focus')
    assert.equal(result.cover.bodyOverflow, 'hidden')
    assert(result.cover.cinematicClass)
    assert(result.cover.backgroundInert, 'Page behind the entry cover must be inert')
    assert.equal(result.cover.siteHeaderPainted, false, 'Site header must not paint over the fullscreen cover')
    assert.equal(result.cover.searchShortcutPainted, false, 'Floating Search shortcut must not paint over the fullscreen cover')
    assert.equal(result.cover.scrollTopPainted, false, 'Scroll-to-top control must not paint over the fullscreen cover')
    assert(result.cover.skipHit, 'Cover Skip must be topmost and hit-testable at its center')
    assert.equal(result.cover.oldTransportCount, 0)
    assert.equal(result.cover.canvasRunning, 'false', 'Artwork RAF must be suspended behind the entry cover')
    await page.waitForTimeout(350)
    const coverAfterWait = await coverState(page)
    assert.equal(coverAfterWait.canvasDraws, result.cover.canvasDraws, 'Artwork draw count must not progress behind the entry cover')
    assert(closeEnough(result.cover.coverRect.x, 0) && closeEnough(result.cover.coverRect.y, 0))
    assert(closeEnough(result.cover.coverRect.width, width) && closeEnough(result.cover.coverRect.height, height))
    assert(result.cover.enterRect.height >= 44 && result.cover.enterRect.bottom <= height && result.cover.skipRect.height >= 44 && result.cover.skipRect.bottom <= height)
    const scrollBefore = await page.evaluate(() => scrollY)
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(150)
    assert.equal(await page.evaluate(() => scrollY), scrollBefore, 'Cover must lock background scroll')
    await page.screenshot({ path: path.join(out, `${name}-cover.png`) })

    await id(page, 'journey-enter').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-video"]')?.currentTime > .12)
    result.playbackGeometry = await playbackGeometry(page)
    assert(mediaRequests.length > 0, 'Enter must trigger the approved v4 request')
    assert(mediaResponses.some(response => response.status >= 200 && response.status < 300), 'Approved v4 media response must succeed')
    assert.equal(result.playbackGeometry.objectFit, 'contain')
    assert.equal(result.playbackGeometry.oldTransportCount, 0, 'Clean video must have no transport/timeline/stage overlay')
    assert.equal(result.playbackGeometry.coverCount, 0)
    assert.equal(result.playbackGeometry.bodyOverflow, 'hidden')
    assert(result.playbackGeometry.cinematicClass)
    assert(result.playbackGeometry.backgroundInert, 'Page behind playback must remain inert')
    assert.equal(result.playbackGeometry.siteHeaderPainted, false, 'Site header must not paint over fullscreen video')
    assert.equal(result.playbackGeometry.searchShortcutPainted, false, 'Floating Search shortcut must not paint over fullscreen video')
    assert.equal(result.playbackGeometry.scrollTopPainted, false, 'Scroll-to-top control must not paint over fullscreen video')
    assert(sameRect(result.cover.coverRect, result.playbackGeometry.mediaRect))
    assert(sameRect(result.cover.coverRect, result.playbackGeometry.videoRect))
    const content = result.playbackGeometry.content
    assert(content.x >= -1 && content.y >= -1 && content.x + content.width <= width + 1 && content.y + content.height <= height + 1, 'Contained microscope picture must not crop outside portrait/desktop viewport')
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-video"]')?.currentTime >= document.querySelector('[data-testid="journey-video"]').duration * .5)
    await page.screenshot({ path: path.join(out, `${name}-video.png`) })

    await page.waitForFunction(() => window.__introQA.events.some(event => event.type === 'ended'))
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
    result.enteringChrome = await page.evaluate(() => {
      const painted = element => {
        if (!element) return false
        const style = getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
      }
      return {
        header: painted(document.querySelector('.site-header')),
        search: painted(document.querySelector('button[aria-label="Open search (Cmd+K)"]')),
        scrollTop: painted(document.querySelector('button[aria-label="Scroll to top"]')),
      }
    })
    assert.deepEqual(result.enteringChrome, { header: false, search: false, scrollTop: false }, 'External site chrome must remain hidden through the entering transition')
    await page.screenshot({ path: path.join(out, `${name}-terminal-handoff.png`) })
    const boundary = await page.evaluate(() => window.__introQA.boundary)
    assert(boundary && boundary.entrance === 0, 'Artwork entrance must begin at zero')
    assert(sameRect(result.cover.coverRect, boundary.mediaRect), 'Cover/video/terminal transition must use one viewport media rectangle')
    assert(sameRect(result.playbackGeometry.videoRect, boundary.canvasRect), 'Terminal-to-live canvas must keep the video rectangle')
    assert.equal(new URL(boundary.stageSrc).pathname, artworkJourney.terminalPoster)
    assert.equal(boundary.stageObjectFit, 'contain')
    assert(boundary.canvasOpacity <= .25, 'Actual terminal still should remain visually dominant at the start of the live transition')

    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
    await page.waitForFunction(() => Number(document.querySelector('[data-testid="artwork-field"]')?.dataset.entrance) === 1)
    const firstJourney = await page.evaluate(() => ({
      events: window.__introQA.events,
      destructive: window.__introQA.destructive,
      frameCount: window.__introQA.frames.length,
      firstFrame: window.__introQA.frames[0] ?? null,
      lastFrame: window.__introQA.frames.at(-1) ?? null,
      sources: window.__introQA.sources,
      videoEnd: window.__introQA.videoEnd,
      videoEndRect: window.__introQA.videoEndRect,
      sameBoundaryCanvas: window.__introQA.boundaryCanvas === document.querySelector('[data-testid="artwork-field"]'),
      settledEntrance: Number(document.querySelector('[data-testid="artwork-field"]')?.dataset.entrance),
      retiredPaused: window.__introQA.video?.paused,
      retiredConnected: window.__introQA.video?.isConnected,
      retiredSource: window.__introQA.video?.getAttribute('src'),
      bodyOverflow: document.body.style.overflow,
    }))
    const start = firstJourney.events.find(event => event.type === 'playing')
    const end = firstJourney.events.find(event => event.type === 'ended')
    result.duration = end?.duration
    result.wallPlaybackSeconds = (end.wall - start.wall) / 1000
    result.eventTypes = firstJourney.events.map(event => event.type)
    result.frameCount = firstJourney.frameCount
    result.firstFrame = firstJourney.firstFrame
    result.lastFrame = firstJourney.lastFrame
    assert(start?.trusted && end?.trusted, 'Playback must use native playing/ended events')
    assert.equal(firstJourney.events.filter(event => event.type === 'ended').length, 1)
    assert(!firstJourney.events.some(event => event.type === 'error' || event.type === 'seeking'), 'Natural first journey must not seek or error')
    assert(firstJourney.events.every(event => event.rate === 1), 'Journey must remain rate 1')
    assert(closeEnough(end.duration, artworkJourney.durationSeconds, .001))
    assert(Math.abs(result.wallPlaybackSeconds - end.duration) < .5, 'Journey must run for its real normal-speed duration')
    assert(firstJourney.sources.some(source => new URL(source).pathname === artworkJourney.src))
    assert(firstJourney.sameBoundaryCanvas && firstJourney.settledEntrance === 1)
    assert(firstJourney.retiredPaused && firstJourney.retiredConnected === false, 'Completed video must be detached at the live handoff')
    assert.equal(firstJourney.bodyOverflow, '', 'Background scroll lock must restore after the live handoff')
    assert(sameRect(firstJourney.videoEndRect, boundary.mediaRect), 'Decoded terminal and live-transition rectangle must match')

    const endPNG = Buffer.from(firstJourney.videoEnd, 'base64')
    writeFile(out, `${name}-video-end.png`, endPNG)
    const terminal = await sharp(terminalFile).removeAlpha().raw().toBuffer()
    const browserTerminal = await sharp(endPNG).removeAlpha().raw().toBuffer()
    assert(browserTerminal.equals(terminal), 'Controlled Chrome decoded terminal must match terminal-v4.png')
    result.terminalMatch = true
    await page.waitForTimeout(120)
    result.firstCleanup = await page.evaluate(() => window.__introQA.destructive)
    assert.equal(result.firstCleanup.filter(event => event.afterEnded && event.isConnected).length, 0, 'Natural completion must never remove src/load while the ended journey video is connected')
    assert.equal(result.firstCleanup.filter(event => event.isConnected).length, 0, 'No destructive reset may touch a connected journey video')
    assert(result.firstCleanup.some(event => event.kind === 'remove-src' && !event.isConnected), 'Detached cleanup must eventually remove the retired video src')
    assert(result.firstCleanup.some(event => event.kind === 'load' && !event.isConnected), 'Detached cleanup must eventually reset decoder resources')
    result.firstRetiredState = await page.evaluate(() => ({
      paused: window.__introQA.video?.paused,
      isConnected: window.__introQA.video?.isConnected,
      src: window.__introQA.video?.getAttribute('src'),
    }))
    assert(result.firstRetiredState.paused && result.firstRetiredState.isConnected === false && result.firstRetiredState.src === null)

    await page.waitForFunction(() => document.querySelector('[data-testid="particle-stage"]')?.dataset.renderer === 'interactive-artwork')
    result.chromeRestored = await page.evaluate(() => {
      const visible = element => {
        if (!element) return false
        const style = getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
      }
      return {
        cinematicClass: document.body.classList.contains('ripple-cinematic-active'),
        headerVisible: visible(document.querySelector('.site-header')),
        searchVisible: visible(document.querySelector('button[aria-label="Open search (Cmd+K)"]')),
      }
    })
    assert.equal(result.chromeRestored.cinematicClass, false)
    assert(result.chromeRestored.headerVisible, 'Site header must restore immediately after live handoff')
    if (width >= 768) assert(result.chromeRestored.searchVisible, 'Desktop floating Search shortcut must restore after live handoff')
    await page.waitForFunction(() => document.querySelector('[data-testid="artwork-field"]')?.dataset.running === 'true')
    const liveDraws = Number(await id(page, 'artwork-field').getAttribute('data-draws'))
    await page.waitForTimeout(180)
    assert(Number(await id(page, 'artwork-field').getAttribute('data-draws')) > liveDraws, 'Live artwork must resume after the entry experience')
    result.canvasResourceGate = { coverRunning: result.cover.canvasRunning, coverDrawsStable: true, liveResumed: true }
    await id(page, 'field-fibers').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="artwork-field"]')?.dataset.category === 'fibers')
    result.highlight = {
      pressed: await id(page, 'field-fibers').getAttribute('aria-pressed'),
      description: await id(page, 'field-description').innerText(),
    }
    assert.equal(result.highlight.pressed, 'true')
    assert.match(result.highlight.description, /thread-like/i)
    result.artwork = await assertFiveArtworkImages(page, imageResponses)

    const replay = id(page, 'journey-watch')
    assert.match(await replay.innerText(), /Replay intro/)
    await page.locator('#tank-search-input').fill('Preserve real search input')
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForFunction(() => window.scrollY >= 400)
    if (width >= 768) await page.waitForFunction(() => {
      const button = document.querySelector('button[aria-label="Scroll to top"]')
      return Boolean(button && getComputedStyle(button).visibility !== 'hidden' && getComputedStyle(button).display !== 'none')
    })
    const replayScrollY = await page.evaluate(() => window.scrollY)
    const replayEventStart = await page.evaluate(() => window.__introQA.events.length)
    const replayDestructiveStart = await page.evaluate(() => window.__introQA.destructive.length)
    await replay.evaluate(button => button.click())
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-video"]')?.currentTime > .2)
    assert.equal(await page.locator('#tank-search-input').inputValue(), 'Preserve real search input')
    const replayGeometry = await playbackGeometry(page)
    assert.equal(replayGeometry.oldTransportCount, 0)
    assert.equal(replayGeometry.siteHeaderPainted, false)
    assert.equal(replayGeometry.searchShortcutPainted, false)
    assert.equal(replayGeometry.scrollTopPainted, false)
    await page.waitForFunction(() => window.__introQA.events.filter(event => event.type === 'ended').length === 2)
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
    await page.screenshot({ path: path.join(out, `${name}-replay-terminal-handoff.png`) })
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live' && !document.querySelector('video'))
    assert.equal(await page.locator('#tank-search-input').inputValue(), 'Preserve real search input')
    assert(closeEnough(await page.evaluate(() => window.scrollY), replayScrollY, 1), 'Replay completion must restore the pre-intro scroll position')
    await page.waitForTimeout(120)
    result.replayNatural = await page.evaluate(({ eventStart, destructiveStart }) => ({
      events: window.__introQA.events.slice(eventStart),
      destructive: window.__introQA.destructive.slice(destructiveStart),
      videoEnd: window.__introQA.videoEnd,
      videoEndRect: window.__introQA.videoEndRect,
    }), { eventStart: replayEventStart, destructiveStart: replayDestructiveStart })
    const replayStart = result.replayNatural.events.find(event => event.type === 'playing')
    const replayEnd = result.replayNatural.events.find(event => event.type === 'ended')
    assert(replayStart?.trusted && replayEnd?.trusted)
    assert.equal(result.replayNatural.events.filter(event => event.type === 'ended').length, 1)
    assert(!result.replayNatural.events.some(event => event.type === 'error' || event.type === 'seeking'))
    assert(result.replayNatural.events.every(event => event.rate === 1))
    assert.equal(result.replayNatural.destructive.filter(event => event.afterEnded && event.isConnected).length, 0, 'Replay natural completion must not reset the connected ended video')
    assert.equal(result.replayNatural.destructive.filter(event => event.isConnected).length, 0, 'Replay cleanup must remain detached before destructive reset')
    assert(result.replayNatural.destructive.some(event => event.kind === 'load' && !event.isConnected), 'Replay must eventually release decoder resources after detach')
    const replayEndPNG = Buffer.from(result.replayNatural.videoEnd, 'base64')
    writeFile(out, `${name}-replay-video-end.png`, replayEndPNG)
    assert((await sharp(replayEndPNG).removeAlpha().raw().toBuffer()).equals(terminal), 'Replay browser terminal must match terminal-v4.png')
    result.replayChromeRestored = await page.evaluate(() => {
      const painted = element => {
        if (!element) return false
        const style = getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
      }
      return {
        header: painted(document.querySelector('.site-header')),
        search: painted(document.querySelector('button[aria-label="Open search (Cmd+K)"]')),
        scrollTop: painted(document.querySelector('button[aria-label="Scroll to top"]')),
      }
    })
    assert(result.replayChromeRestored.header)
    if (width >= 768) {
      assert(result.replayChromeRestored.search)
      assert(result.replayChromeRestored.scrollTop)
    }
    result.replayCompletedNaturally = true
    await page.screenshot({ path: path.join(out, `${name}-live-highlight.png`) })

    const requestsBeforeReload = mediaRequests.length
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-watch"]')?.disabled === false)
    await page.waitForTimeout(500)
    result.returning = {
      coverCount: await id(page, 'journey-entry-cover').count(),
      videoCount: await page.locator('video').count(),
      replayText: await id(page, 'journey-watch').innerText(),
      extraMediaRequests: mediaRequests.length - requestsBeforeReload,
    }
    assert.equal(result.returning.coverCount, 0)
    assert.equal(result.returning.videoCount, 0)
    assert.match(result.returning.replayText, /Replay intro/)
    assert.equal(result.returning.extraMediaRequests, 0, 'Same-session reload must bypass cover and video request')
    await page.screenshot({ path: path.join(out, `${name}-returning.png`) })

    assert(openingResponses.some(response => response.status === 200), 'Exact opening-v4 cover image request must succeed')
    assert.deepEqual(errors, [])
    assert(api.every(request => request.method === 'GET'))
    result.mediaResponses = mediaResponses
    result.openingResponses = openingResponses
    result.inputPreserved = true
    result.recordingStartEpoch = recordingStartEpoch
    result.handoffEpochs = [
      { label: 'first-ended-to-entering', epoch: end.epoch },
      { label: 'replay-ended-to-entering', epoch: replayEnd.epoch },
    ]
    result.passed = true
    console.log(JSON.stringify({ name, passed: true, duration: result.duration, wall: result.wallPlaybackSeconds, frames: result.frameCount }))
  } catch (error) {
    result.error = error.message
    console.error(name, error.message)
    await page.screenshot({ path: path.join(out, `${name}-failure.png`) }).catch(() => {})
  } finally {
    result.errors = errors
    result.api = api
    result.mediaRequestCount = mediaRequests.length
    const video = page.video()
    await context.close()
    if (video) {
      const recording = path.join(out, `${name}.webm`)
      await video.saveAs(recording)
      await video.delete()
      if (result.passed && result.handoffEpochs) {
        try {
          result.recordingHandoffAnalysis = await analyzeHandoffRecording(recording, width, height, recordingStartEpoch, result.handoffEpochs)
          writeFile(out, `${name}-handoff-frame-analysis.json`, JSON.stringify(result.recordingHandoffAnalysis, null, 2) + '\n')
        } catch (error) {
          result.passed = false
          result.error = `Recording handoff analysis failed: ${error.message}`
        }
      }
    }
  }
  return result
}

async function simpleContext(browser, name, operation, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: options.reducedMotion || 'no-preference',
    serviceWorkers: 'block',
  })
  await instrument(context)
  const api = [], mediaRequests = [], mediaResponses = [], imageResponses = [], openingResponses = [], errors = []
  await isolateApis(context, api)
  if (options.beforePage) await options.beforePage(context)
  const page = await context.newPage()
  page.setDefaultTimeout(25000)
  observePage(page, mediaRequests, mediaResponses, imageResponses, openingResponses, errors)
  const result = { name, passed: false }
  try {
    await operation({ context, page, result, mediaRequests, mediaResponses })
    assert.deepEqual(errors, [])
    assert(api.every(request => request.method === 'GET'))
    result.passed = true
    await page.screenshot({ path: path.join(out, `${name}.png`) }).catch(() => {})
    console.log('PASS', name)
  } catch (error) {
    result.error = error.message
    console.error(name, error.message)
    await page.screenshot({ path: path.join(out, `${name}-failure.png`) }).catch(() => {})
  } finally {
    result.errors = errors
    result.mediaRequestCount = mediaRequests.length
    result.mediaResponses = mediaResponses
    await context.close()
  }
  return result
}

async function lifecycleCases(browser) {
  const checks = []
  checks.push(await simpleContext(browser, 'cover-skip', async ({ page, result, mediaRequests }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-entry-cover').waitFor()
    assert.equal(mediaRequests.length, 0)
    await id(page, 'journey-cover-skip').click()
    await page.waitForFunction(() => !document.querySelector('[data-testid="journey-entry-cover"]'))
    assert.equal(mediaRequests.length, 0)
    assert.equal(await page.locator('video').count(), 0)
    assert.match(await id(page, 'journey-watch').innerText(), /Replay intro/)
    await page.waitForFunction(() => document.querySelector('[data-testid="artwork-field"]')?.dataset.running === 'true')
    result.searchFocused = await page.locator('#tank-search-input').evaluate(element => element === document.activeElement)
    assert(result.searchFocused)
    result.canvasResumedAfterSkip = true
  }))

  checks.push(await simpleContext(browser, 'cover-escape', async ({ page, result, mediaRequests }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-entry-cover').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[data-testid="journey-entry-cover"]'))
    assert.equal(mediaRequests.length, 0)
    assert.match(await id(page, 'journey-watch').innerText(), /Replay intro/)
    result.escapeSkippedCover = true
  }))

  checks.push(await simpleContext(browser, 'entering-escape', async ({ page, result }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-enter').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'entering')
    result.entranceAtEscape = Number(await id(page, 'artwork-field').getAttribute('data-entrance'))
    assert(result.entranceAtEscape < 1)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
    assert.equal(await page.locator('video').count(), 0)
    result.escapeSkippedTransition = true
  }))

  checks.push(await simpleContext(browser, 'playback-escape', async ({ page, result }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-enter').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-video"]')?.currentTime > .35)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live' && !document.querySelector('video'))
    assert.equal(await id(page, 'journey-entry-cover').count(), 0)
    assert.match(await id(page, 'journey-watch').innerText(), /Replay intro/)
    result.escapeSkippedPlayback = true
  }))

  checks.push(await simpleContext(browser, 'reduced-motion-bypass', async ({ page, result, mediaRequests }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-watch"]')?.disabled === false)
    await page.waitForTimeout(400)
    assert.equal(await id(page, 'journey-entry-cover').count(), 0)
    assert.equal(await page.locator('video').count(), 0)
    assert.equal(mediaRequests.length, 0)
    assert.match(await id(page, 'journey-watch').innerText(), /Explore without motion/)
    result.sessionMarked = await page.evaluate(() => sessionStorage.getItem('ripple-entered'))
    assert.equal(result.sessionMarked, '1')
  }, { reducedMotion: 'reduce' }))

  checks.push(await simpleContext(browser, 'decode-failure-retry', async ({ context, page, result }) => {
    let fail = true
    await context.route(url => url.pathname === artworkJourney.src, route => {
      if (fail) return route.fulfill({ status: 200, contentType: 'video/mp4', body: 'not a valid mp4' })
      return route.continue()
    })
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-enter').click()
    await id(page, 'journey-playback-error').waitFor()
    assert.match(await id(page, 'journey-watch').innerText(), /Retry intro/)
    fail = false
    await id(page, 'journey-watch').click()
    await page.waitForFunction(() => window.__introQA.events.some(event => event.type === 'ended'))
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
    assert.equal(await id(page, 'journey-playback-error').count(), 0)
    result.retryRecovered = true
  }))

  checks.push(await simpleContext(browser, 'play-rejection-retry', async ({ page, result }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      const original = HTMLMediaElement.prototype.play
      let rejectOnce = true
      HTMLMediaElement.prototype.play = function () {
        if (rejectOnce && this instanceof HTMLVideoElement && this.matches('[data-testid="journey-video"]')) {
          rejectOnce = false
          return Promise.reject(new DOMException('QA injected play rejection', 'NotAllowedError'))
        }
        return original.call(this)
      }
    })
    await id(page, 'journey-enter').click()
    await id(page, 'journey-playback-error').waitFor()
    assert.match(await id(page, 'journey-watch').innerText(), /Retry intro/)
    await id(page, 'journey-watch').click()
    await page.waitForFunction(() => window.__introQA.events.some(event => event.type === 'ended'))
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live')
    result.playRetryRecovered = true
  }))

  checks.push(await simpleContext(browser, 'suspension-cleanup', async ({ context, page, result }) => {
    await page.goto(base.origin + '/', { waitUntil: 'domcontentloaded' })
    await id(page, 'journey-enter').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-video"]')?.currentTime > .45)
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')

    await page.locator('[data-testid="journey-video"]').evaluate(video => { video.style.transform = 'translateY(200vh)' })
    await page.waitForFunction(() => document.querySelector('[data-testid="journey-video"]')?.paused)
    const offscreenTime = await page.locator('[data-testid="journey-video"]').evaluate(video => video.currentTime)
    await page.waitForTimeout(700)
    assert(Math.abs(await page.locator('[data-testid="journey-video"]').evaluate(video => video.currentTime) - offscreenTime) < .06)
    await page.locator('[data-testid="journey-video"]').evaluate(video => { video.style.transform = '' })
    await page.waitForFunction(time => document.querySelector('[data-testid="journey-video"]')?.currentTime > time + .1, offscreenTime)
    result.offscreenSuspended = true

    result.documentHidden = {
      exercisedInFinalRun: false,
      limitation: 'Final authoritative QA is headless/hidden to avoid visible Chrome-window or tab churn; this run does not synthesize document.hidden.',
      preservedControllerGate: 'cinematic-intro.tsx shouldSuspend() includes document.hidden and retains the existing visibilitychange listener.',
      priorEvidence: 'docs/qa/phase-e/playback/README.md documents preserved offscreen/visibility suspension for the same controller lineage.',
    }

    await page.keyboard.press('Escape')
    await page.waitForFunction(() => document.querySelector('[data-testid="ripple-hero"]')?.dataset.state === 'live' && !document.querySelector('video'))
    result.cleanup = await page.evaluate(() => ({
      retiredPaused: window.__introQA.video?.paused,
      retiredSource: window.__introQA.video?.getAttribute('src'),
      bodyOverflow: document.body.style.overflow,
      backgroundStillInert: Boolean(document.querySelector('.site-header')?.inert || document.querySelector('.ripple-editorial')?.inert),
    }))
    assert(result.cleanup.retiredPaused && result.cleanup.retiredSource === null)
    assert.equal(result.cleanup.bodyOverflow, '')
    assert.equal(result.cleanup.backgroundStillInert, false)
  }))
  return checks
}

async function main() {
  const { chromium, executablePath } = loadPlaywright()
  const scratch = fs.mkdtempSync(contained(out, '.browser-'))
  const oldTemp = process.env.TEMP
  const oldTmp = process.env.TMP
  let browser
  try {
    process.env.TEMP = process.env.TMP = scratch
    browser = await chromium.launch({
      headless: true,
      executablePath,
      downloadsPath: scratch,
      args: ['--force-color-profile=srgb'],
    })
    report.browser = browser.version()
    const viewports = supplement ? [[320, 568]] : [[1440, 900], [390, 844], [320, 568]]
    for (const [width, height] of viewports) {
      const result = await normalJourney(browser, width, height)
      upsertCheck(result)
      save()
    }
    for (const result of await lifecycleCases(browser)) upsertCheck(result)
  } finally {
    if (browser) {
      await browser.close()
      report.browserClosed = true
    }
    if (oldTemp === undefined) delete process.env.TEMP
    else process.env.TEMP = oldTemp
    if (oldTmp === undefined) delete process.env.TMP
    else process.env.TMP = oldTmp
    fs.rmSync(contained(out, scratch), { recursive: true, force: true, maxRetries: 2 })
    report.passed = report.checks.length > 0 && report.checks.every(check => check.passed)
    save()
    if (!report.passed) process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error.stack || error.message)
  save()
  process.exitCode = 1
})
