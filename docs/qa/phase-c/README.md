# Phase C — interactive artwork and a clearer water-data interface

Built on `e7269d80291e4fbb9588ed1a27eb2bea2ce04f1f`, on the existing
`agent/cinematic-water-v2` branch / PR #2. Phase B sources, rough candidate,
joined timing proof, and historical evidence are preserved.

## Design direction

The user's reference was [Prajwal Tomar's design-workflow article](https://x.com/PrajwalTomar_/status/2100211370897920136).
The applied ideas are a single dominant image, useful image-adjacent information,
specific product copy, readable controls, and fewer interchangeable decorative
sections. This work does not claim to have connected Mobbin or studied its entire
catalogue. The article's promotional model/benchmark claims were not adopted.

The actual earlier ChatGPT-generated particle master and category images were
located in the user's Library and visually checked against the shipped artwork.
The existing optimized images retain their verified hashes. No replacement
image was generated, no image-model API was purchased, and no specific generation
model version is asserted for this work.

## What changed

The hero retains the coordinated particle master but now exposes real category
highlighting, gentle pointer displacement, tap impulses, and Pause/Resume.
These are **interactive artwork regions**, not detected or measured particles.
Reduced-motion mode keeps a static field with usable category selection. Hidden,
offscreen, paused and unmounted fields do not keep an animation loop running.

The three atlas images are now keyboard-accessible tabs. Each shows different
observations, identification limits and sample-record guidance. All three actual
images remain visible and lazy-loaded. The separate interactive bottle/specimen
viewer is retained; the atlas does not replace it with a picture.

The narrative is shorter and more specific: sample examination, a sourced
research finding with adjacent limitations, and contribution. Repeated slogans,
the pinned body-route sequence, animated research counter, and decorative
refraction were removed. The approximate study average is not presented as a
measurement of the illustrated bead, a local utility or the visitor's exposure.

Homepage changes remove the competing animated ticker and saturated marketing
glows, simplify contribution copy, and retain the real search first. Search
failures have a persistent, retryable service-error state; an empty result has a
different message. Neither is described as evidence that water is safe or clean.
Null/non-numeric system scores are not formatted as genuine scores. Benchmark,
provenance, aggregation, authentication and database code are unchanged.

## Video-to-live transition

The original prior-chat file `genjutsu_microscope_driving_shot.mp4` was recovered
through Library Download and copied unchanged into the project:

```text
public/media/ripple/live/microscope-original.mp4
1653270 bytes / 1920×1080 / 150 frames / 30 fps / 5 seconds
SHA-256 122d925177afe1267ca1a038dccd352385ebddefe409b65bcdf0d1388e0de9d3
```

There is no re-encoding, retiming, metadata change, audio change or procedural
replacement of that shot. Opening and terminal posters are lossless images of
its decoded RGB frames 0 and 149. Frame 149 is actual optical black, not an
invented transition placeholder. Original full-range/BT.470BG metadata is kept.

Watch plays that source. Its natural end reveals the already-prepared live
canvas at the same black boundary, then starts a 3.4-second artwork-camera
entrance. A small forward scale and depth-weighted settling accompany the
whole-frame emergence. The same canvas and clock continue after the entrance;
there is no endpoint replacement with unrelated polygons or another picture.
There is no circular iris, portal, page hole or baked-in text/search.

`artwork-field.ts` contains no frame scheduler, network request or listener.
`artwork-field-canvas.tsx` owns one visibility-aware clock, bounded resolution,
30fps drawing, asynchronous image loading, and cleanup. Repeated renderer inputs
are deterministic. The initial settled state is the actual master image.

This is an image-derived **2.5D artwork presentation**, not a volumetric 3D
reconstruction, a physical fluid simulation, a laboratory view or a newly
encoded photoreal continuation. The old rough 3D candidate remains available
but is not shipped into the hero. Recovered imagery is reused, not repainted
as flat synthetic particles.

## Evidence and tests

The completed integrated run passed **19/19 browser cases**, including the five
sizes, two complete recorded journeys, live-field pause/offscreen behavior,
keyboard atlas selection, rejected/delayed playback, reduced motion, failed
artwork/canvas fallbacks, and real-home service-error/retry/empty states. Both
recorded transitions captured exact black in the actual browser's last video
frame and first canvas frame, and retained the same canvas into live operation.
The separate native **200% zoom** run passed without horizontal overflow.

All eight fixture/media/type/lint/build gates passed. Repository-wide lint still
reports **61 errors and 3 warnings**, all in files unchanged from `e7269d8`.
The separate design review passed **7/7 cases**. Exact timings and raw results,
including browser limitations, remain in the corresponding result files.

[Renderer evidence](renderer/README.md) includes exact boundary/master/repeat
comparisons, nonblack-boundary round trips, actual pointer/impulse/category pixel
differences, camera easing, memory disposal and bounded draw-submission timing.
Submission timing is not a GPU-completion or cross-device performance guarantee.

[Design evidence](design/README.md) covers image tabs, narrative, native keyboard
selection, light/dark surfaces and responsive layout. Its initial capture
predates completed hero integration and is not substituted for final app tests.

Integrated results and normal-speed recordings are in `browser/`. The journey
checks capture the actual browser video frame on a trusted natural `ended`
event and the first live canvas frame, verify black RGB pixels, and verify that
the same canvas continues after entry. They do not seek the video, accelerate it
or dispatch synthetic completion events. Browser dimensions are 1440×900,
1024×768, 768×1024, 390×844 and 320×568. Mobile is Chromium emulation, not a
physical-device Safari certification.

The isolated study requires zero API requests. Homepage tests intercept every
API request before navigation, exercise real form submission through a fixture
500/retry/empty response sequence, and never contact the backend. The build and
existing data regressions likewise use no real database. No migration, seed,
production merge or live-data mutation is part of this update.

`checks/results.json` records the fresh fixture regressions, original media
integrity, TypeScript, scoped lint and production build. `checks/lint-baseline.json`
separates repository-wide diagnostics from this change by comparing exact files
against the prior checkpoint; full-repository lint is not silently treated as clean.

## Reproduce

Use existing project dependencies and installed FFmpeg/Playwright/Chrome. No
dependency install or paid service is required. Set `PLAYWRIGHT_MODULE` when the
installed package is outside the checkout. Run browser scripts sequentially.

```text
node scripts/qa/phase-c-checks.cjs
node scripts/qa/phase-c-browser.cjs
```

For actual 200% browser zoom, run the existing zoom harness with `QA_OUTPUT` set
to `docs/qa/phase-c/browser`. It uses native browser zoom, not CSS zoom or a
pinch transform. `QA_BASE_URL` defaults to the existing local server on port 3020.

The original microscope source can be verified without rewriting files with
`node scripts/phase-c-artwork-assets.cjs --check`.
