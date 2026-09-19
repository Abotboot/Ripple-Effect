# Phase D specimen inspection

Full browser review: **9/9 passed**, zero API requests, zero uncaught page
errors. The refreshed-server run completed at `2026-09-19T07:16:57.146Z` using
Chrome `152.0.7977.83`. Scoped TypeScript reported zero diagnostics, scoped
ESLint passed, and `git diff --check` reported no whitespace errors. The browser
is closed and its shared slot has been released to prime.

A final, parameter-only UV legibility adjustment was then checked at desktop
and mobile widths: **2/2 passed** at `2026-09-19T07:20:46.559Z`, again with zero
API requests. Fiber radius changed from `.0028` to `.0042` (1.5×), fragment scale
increased 1.4×, and particle opacity rose modestly. Shell lighting, scene count,
layout, controls and lifecycle code did not change. Scoped lint and TypeScript
were rerun successfully. `legibility-results.json` and
`1440-uv-legibility-final.png` / `390-uv-legibility-final.png` show that final
appearance and were inspected locally; corresponding complete workbench shots
are saved alongside them. The full nine-case result and recordings precede
this small visual adjustment, rather than claiming an additional full rerun.

Worker 2 owns only the specimen component, its stylesheet, the bottle renderer,
the new fallback renderer, and this directory. Work began on
`agent/specimen-data-polish` at `be0f622`. No hero, artwork-field, asset-registry,
counter, about, database, package, or configuration changes were made here.
No generated images, external assets, paid services or API keys are used.

## Implementation

- `src/components/atmosphere/bottle-scene.ts`: one Three.js PET-shaped bottle in
  both views. The lathed shell has modeled grip grooves and a shallow five-lobed
  base; its cap and narrow label remain part of the same rotating object.
  Custom thin-shell reflections are illustrative lighting, not a validated
  physical-refraction model. The scene does not replace the bottle with a
  wireframe or swap between still images.
- `src/components/atmosphere/specimen-inspector.tsx` and `.css`: mode selection,
  actual horizontal drag/range rotation, form filters, replayable scan, manual
  pause, direct descriptions, and an explicit unmeasured/undetermined readout.
  The research number is not repeated as a bottle measurement. The NIH link and
  the distinction between an illustration and a material test remain visible.
- `src/components/atmosphere/specimen-fallback.ts`: a static 2D bottle if WebGL is
  unavailable or its context is lost. Form selection and both views still work.
  The UI labels this fallback and disables rotation, scan and animation rather
  than presenting 2D image manipulation as 3D rotation.

The UV concept reveals a deliberately sparse set of nine modeled fibers and
seventeen small extruded fragments. Those are internal illustration choices,
not counts reported to visitors as water data. The same canvas, shell and
camera persist through the transition. A narrow scan moves through the object;
the label becomes translucent, and the forms then move very slightly to help
separate overlap. No purple light wash, emissive particle cloud or large floating
debris is introduced.

The component imports the Three.js renderer only after its canvas enters the
viewport. It suspends repeated drawing when offscreen or when the document is
hidden. Macro rests without a loop. UV motion draws at roughly 30 frames per
second; manual pause and reduced motion leave only on-demand updates for user
controls or resize. Reduced motion applies view and angle changes immediately.
Cleanup cancels animation frames, disconnects observers and disposes geometry,
materials, textures and the WebGL renderer. This is scoped lifecycle behavior,
not a claim about whole-page GPU usage or native-device performance.

## Validation commands

From the repository root:

```powershell
node node_modules/eslint/bin/eslint.js src/components/atmosphere/specimen-inspector.tsx src/components/atmosphere/bottle-scene.ts src/components/atmosphere/specimen-fallback.ts docs/qa/phase-d/specimen/review-specimen.cjs docs/qa/phase-d/specimen/typecheck-specimen.cjs

node docs/qa/phase-d/specimen/typecheck-specimen.cjs

$env:PLAYWRIGHT_MODULE='C:/Users/ayada/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node docs/qa/phase-d/specimen/review-specimen.cjs

git diff --check -- src/components/atmosphere/specimen-inspector.tsx src/components/atmosphere/specimen-inspector.css src/components/atmosphere/bottle-scene.ts src/components/atmosphere/specimen-fallback.ts docs/qa/phase-d/specimen
```

`specimen-results.json` is the latest browser result. `typecheck-results.json`
records the compiler check without emitting application build files. The browser
review uses one Chrome instance, closes it in `finally`, visits `/motion-study`,
and intercepts any unexpected API request. A passing case requires zero API
requests and zero uncaught page errors.

Coverage includes five layouts (1440×1000, 1024×768, 768×1024, 390×844 and
320×568), original-to-UV continuity, scan pause/replay, real keyboard and pointer
rotation, form filtering, frame-count stability when paused/offscreen/reduced,
and explicit WebGL-unavailable/context-loss fallback. It checks 44px control
heights, horizontal clipping, selected-control contrast and the final toolbar
CSS. Document hiding is tested with a synthetic `document.hidden` value and
`visibilitychange`; it is not evidence of native tab backgrounding. Mobile
layouts are Chrome emulation rather than Safari/device testing.

## Evidence and verification notes

`baseline-macro.png` and `baseline-uv.png` capture the starting application.
The width-prefixed files show the new macro view, scan, UV view, actual rotation
and complete workbench. `recordings/layout-1440.webm` and
`recordings/layout-390.webm` are unedited Playwright screen recordings; their
hashes and sizes are recorded in the browser result. Fallback captures are
separately labeled. These artifacts are illustrative rendering evidence, not
laboratory observations or proof of an optical assay.

An initial browser run passed all nine functional cases. Visual review then
found that the development server was still serving the first version of the
global specimen CSS after the source toolbar/hover changes. Added contrast and
served-layout assertions correctly failed against that stale stylesheet.
Prime restarted the exact development server, then the complete nine-case run
passed against the final stylesheet. Its five layout cases each confirmed the
flex control bar and a calculated selected-hover text contrast of 11.95:1.
Final desktop, tablet, mobile and fallback captures were inspected locally.

The lifecycle evidence includes a scan frozen at progress `0.041` with render
count `56` unchanged during the pause observation, followed by successful
resumption. The offscreen observation remained at `115` rendered frames,
manual pause after leaving/reentering remained at `119`, synthetic document
hide remained at `121`, and reduced motion remained at `124`. These are bounded
observations of this renderer, not a general browser or battery benchmark.

Prime owns the integrated application regression, production build and final
review. This worker makes no commits.
