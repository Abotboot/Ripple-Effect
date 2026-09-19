# Phase B browser evidence

This evidence covers the existing supplied timing video, the exact terminal still, the five reviewed artworks, and the existing HTML search and specimen controls. The hero is a **static terminal fallback**, not an interactive particle renderer. The timing proof's final artwork does not match the supplied particle master.

The complete acceptance run finished at **2026-09-19 03:51:08.620 UTC** with **24/24 cases passing**, exit code 0, using Chrome **152.0.7977.83**. All 22 study cases made zero API requests. Each of the two homepage cases made eight intercepted GET requests and sent no API traffic to the backend. Both final recordings include the full journey and subsequent interactions; their hashes are in `results.json`.

## Reproduce

Run from the repository root with the existing local server at `http://localhost:3020`:

```powershell
$env:PLAYWRIGHT_MODULE='C:/Users/ayada/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:QA_ONLY=''
$env:QA_RUN_LABEL='results'
node scripts/qa/phase-b-browser.cjs
node scripts/qa/phase-b-zoom.cjs
```

Run the scripts sequentially. The main script uses one Chromium browser with sequential contexts and closes it before exit. The zoom script then uses one temporary Chromium profile and an extension calling `chrome.tabs.setZoom(tabId, 2)`. It does not use CSS zoom or pinch scaling. No dependency installation is required.

`results.json` contains the full run's status, per-case results, actual asset responses, API observations, native media events, and recording hashes. `browser-zoom-200.json` contains the independent zoom result and measured browser geometry. A nonzero exit or `success: false` is a failure, even when other cases pass.

Zoom screenshots use Playwright's CDP `Page.captureScreenshot` with no clip, capturing Chromium's complete surface at the unchanged tab zoom. The default Playwright screenshot clip cropped the image after native tab zoom even though DOM geometry and keyboard checks passed; the corrected capture does not change page zoom or layout. Both controls are also checked with `elementFromPoint` before keyboard focus can scroll them.

The final zoom run, started **2026-09-19 03:52:52.179 UTC**, passed with exit code 0. It measured a 709×401 CSS viewport inside a 1440-pixel-wide window, device pixel ratio 2, visual viewport scale 1, CSS zoom 1, and document width 709. Both 44-pixel-tall player controls were visible and received pointer hits. Keyboard pause, Escape, input focus, and local search submission passed with zero API requests and no uncaught browser errors. The corrected full-surface Watch screenshot was visually reviewed.

## Coverage

The layout checks use 1440×900, 1024×768, 768×1024, 390×844, and 320×568. Each loads and decodes all five actual artworks, checks the media ratio and layer alignment, checks horizontal overflow and control overlap, and starts Watch after scrolling below the hero. The harness does not scroll the video into view after Watch. It checks that both player controls are visible and receive pointer hits before a locator can scroll either control.

The native journey checks retain the unmodified playback rate of 1, perform no seeking, and wait for the browser's trusted `ended` event. They assert the 8.6-second duration and verify that the finished video is detached, paused, and has released its source. The terminal image uses the exact unoptimized terminal path, has no transformed `srcset`, and loads eagerly while playback is active.

The first hidden-to-visible editorial transition is recorded in `desktop-media-events.json`, `mobile-media-events.json`, and `timeupdate-fallback-media-events.json` before assertions run. With `requestVideoFrameCallback`, acceptance uses its presented-frame `mediaTime` at or after 7.5 seconds. That clock can slightly lead `video.currentTime`; the two values are recorded separately. Without that callback, acceptance uses the `timeupdate` media clock and does not claim presented-frame synchronization. A manual pause longer than the reveal wall time checks that the reveal does not run from a timer.

The recovery cases cover keyboard Tab/Space/Escape, visible search focus, typed input preservation, manual pause across viewport changes, actual offscreen suspension and resume, superseded play rejection, delayed playback after cleanup, rejected playback, failed video loading, blocked session storage, returning sessions, deep links, reduced motion on load and during playback, and failed master/video/terminal posters. Missing artwork is reported as unavailable rather than being labeled an exact displayed frame.

## Recordings and interactions

`recordings/desktop-journey-and-interactions.webm` and `recordings/mobile-journey-and-interactions.webm` are unedited Playwright recordings. Each includes the complete natural journey, its static handoff, typing and submitting the native study search, scrolling the three static atlas cards, using the atlas's specimen anchor, switching the existing specimen from Macro to UV, keyboard rotation to −120°, and viewing the supplied sample-slide artwork.

The study form preserves the typed input and displays its local interaction preview; it does not fetch or fabricate water results. The atlas cards are static illustrations with an actual navigation link. The separate specimen canvas has existing interactive controls. The checks capture different canvas pixel hashes for Macro, UV, and rotation, and record whether that specimen used WebGL or its 2D fallback. None of these interactions is evidence of a live particle hero.

## API scope

Every `/motion-study` case requires **zero API requests**.

The two `mocked-home-*` cases run the real `/` homepage at desktop and mobile sizes. Before navigation, every `**/api/**` request is intercepted. Known read routes return empty QA fixtures; unknown routes or writes receive a local 503 response. No API route is continued to the backend. These checks verify that the atlas follows `#search`, the sample anchor exists, all five artworks load, the real `#tank-search-input` survives Watch/Skip, and submitting the real form dispatches an intercepted GET to `/api/utilities?q=60614`. These are mocked UI integration checks, not evidence about backend data or production search results.

## Findings preserved

`watch-before.json` and the `*-watch-before.png` images preserve the original mobile failure: activating Watch could leave the video fully above the viewport, paused at time zero. The UI now scrolls the stage into view. `mocked-home-*-watch-before.png` preserves the homepage sticky header covering player controls; the UI now accounts for its measured height.

`results-initial.json` and `results-before-hydration-guard.json` preserve earlier failed runs. The initial reveal assertion incorrectly required both clocks to reach the cue together; the corrected assertion checks the clock actually used by the controller and retains both measurements. The first offscreen test only brought an atlas heading into view and could leave part of the video visible; it now confirms that the entire video is offscreen. The delayed-play case exposed a detached video being unpaused before its pending promise settled; cleanup now retains a minimal play guard until settlement. An intermittent rejected-play case remained at the initial poster, consistent with a pre-hydration activation; Watch and idle Skip now remain disabled until hydration, and error checks await the actual terminal state.

## Limits

Desktop and mobile runs use installed Chromium/Chrome on this Windows machine. Mobile viewport, touch, and mobile browser behavior are emulated, not measured on physical phones or Safari. The document-hidden check explicitly simulates `document.hidden` and dispatches `visibilitychange`; the offscreen test uses genuine scrolling and IntersectionObserver. The recordings retain any development-server indicators visible in the browser.

These checks do not establish a seamless live continuation, a master-artwork match, real laboratory measurements, or production backend correctness. Build, provenance, database-safety, source-renderer, and independent terminal-decoder checks are owned by the prime and are reported separately.
