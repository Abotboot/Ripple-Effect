# Phase F specimen browser regression

Worker: `worker-3`
Agent run: `cb123540-ecb3-415b-8ece-0056dcf05976`
Route: `http://localhost:3020/motion-study`

This was a bounded regression in the existing shared Chrome session. The tab
was attached rather than replaced, then released when the checks below were
complete. No second browser/profile was started.

## Desktop result

The attached page reported a 1280 x 585 CSS-pixel viewport at device pixel
ratio 1.5. The specimen page had zero horizontal overflow.

- The bottle source decoded at 1122 x 1402 and resolved to
  `/media/ripple/specimen/retail-pet-clean.webp`.
- The whole-bottle overview contained zero canvases. Particle illustration
  remains confined to the separate detail canvas.
- Initial macro state was `photo-canvas`, `rendered=macro`,
  `motion=idle`, `running=false`, `visibleForms=0`,
  `zoom=3`, and `position=0.500,0.260`.
- A real browser click on the bottle moved the selected detail to
  `position=0.499,0.499` and rerendered the image crop.
- A real `ArrowDown` key press on the Detail position range control moved it
  to 49%, updated the canvas to `position=0.499,0.490`, and exposed
  `aria-valuetext="49 percent down the image, near label"`.
- Illustrative UV settled with 12 visible authored forms and
  `scanProgress=1.000`. The whole-bottle source and zero-overview-canvas
  invariant stayed unchanged.

## Failure and lifecycle result

A one-shot throw was injected into the live 2D canvas `drawImage` call to
exercise the renderer failure callback. The source image was left alone.

- Failure hid the detail canvas, stopped its animation, disabled the detail
  position control, preserved the full bottle, and exposed the
  `Retry detail` control.
- Clicking `Retry detail` through the browser rebuilt the renderer:
  `hidden=false`, `rendered=uv`, `motion=active`, controls enabled,
  retry removed, and the stale `data-disposed` marker absent.
- The reduced-motion branch was exercised by temporarily supplying
  `matches=true` for the component's exact media query and triggering a
  normal React update. After settling it reported
  `motion=reduced-motion`, `running=false`, `scanProgress=1.000`;
  Pause and Replay reveal were disabled and Pause read `Motion reduced`.
  This is an in-page branch simulation, not an operating-system preference
  change.
- In normal UV mode, moving the specimen offscreen changed
  `motion` from `active` to `offscreen`, changed `running` from
  `true` to `false`, and stopped render-count growth. Returning it onscreen
  resumed animation.
- A synthetic `document.hidden=true` plus `visibilitychange` kept the
  render count at 29 while hidden and set `running=false`; restoring document
  visibility resumed with the next count at 30. This is a synthetic hidden
  document check rather than native background-tab emulation.

The browser network capture contained two specimen asset GETs and both returned
HTTP 200 with `image/webp`. No failed request for the bottle asset was
observed.

The development console was not clean enough for a zero-error assertion:
reloading/Back-Forward Cache activity generated repeated Next development HMR
WebSocket errors. They were unrelated to the caught specimen failure path, so
this run makes no blanket console-error claim.

## Fresh 390 px limitation

A fresh exact 390 px Phase F browser assertion was not obtained. The shared
browser connector continued reporting `innerWidth=1280` after the native
Chrome window was narrowed. A same-origin 390 px iframe attempt was blocked and
loaded `chrome-error://chromewebdata/`; that QA-only iframe was removed.

The previous Phase E specimen suite contains 390 x 844 captures and interaction
proof for the same responsive workbench structure, but those files are context
only. They are not presented as new Phase F mobile proof.
