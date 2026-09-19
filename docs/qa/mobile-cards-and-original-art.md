# Mobile cards, intro access, and original illustrations

Verified 2026-09-19 in local Chromium and WebKit with public read-only API responses used as fixtures. No database writes. WebKit is browser-engine emulation, not a physical iPhone XR test.

## Card navigation

Both engines passed at 414×896, 320×568, and 896×414:

- Search result detail, recent utility, and map utility: reachable close control, scrolling content, restored page scrolling after dismissal.
- Mobile utility header includes Back; the portal stays above navigation and respects viewport/safe-area bounds.
- Nested and standalone community report cards: close and Back return to the previous view without leaving the page locked.
- Particle atlas, sample link, and all five illustrated plastic cards: interaction and return Home work without opening a trapping overlay.
- Removed bottle inspection and original-image disclosure remain absent.

Chromium verified wheel scrolling. Mobile WebKit does not expose wheel input through Playwright; its scrollable region was focused and advanced with PageDown. Exits and illustration controls used touch-capable contexts.

## Intro

Both engines passed at 1280×720, 414×896, and 320×568: first-visit `/#home` cover, user-initiated normal-speed playback, video-to-artwork handoff, interactive search, replay after scrolling, and complete cleanup. Replay intro is visible near the top of the hero. Reduced-motion visitors can open the static entry cover explicitly. Session and reduced-motion bypass remain intentional.

Reduced motion, Escape during handoff, disabled CSS animation, unavailable artwork, and failed video scenarios passed. Touch users also have Skip intro during playback.

## Artwork

Five existing educational entries use independent foreground artwork over a stationary water plate. Tap Inspect toggles enlargement; Pause stops motion. Offscreen/background animation is suspended and reduced motion is respected. Three new transparent subject assets and one background total approximately 316 KB. Original fiber and fragment assets are reused. Generation mode and complete prompts are in `public/media/ripple/illustrations/README.md`.

## Reproduce

Set `PLAYWRIGHT_MODULE` to the installed Playwright package and start the app on port 3020. Run `node scripts/qa/utility-scroll-regression.cjs` and `node scripts/qa/intro-handoff-regression.cjs`. Set `QA_BROWSER=webkit` for WebKit and `QA_OUTPUT` for artifacts. Reports, screenshots, and normal-speed recordings were retained in the task's outputs directory under `mobile-cards-v2`, `webkit-mobile-cards`, `intro-xr-v2`, and `webkit-intro`.
