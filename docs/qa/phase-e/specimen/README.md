# Phase E specimen: one bottle image and a real detail view

Implementation begins from `bfcbe4e` on `agent/specimen-data-polish`. This review covers the specimen only. Prime owns the microscope journey, data/counter work, integration build and deployment.

Final complete browser run: **9/9 PASS**, completed `2026-09-19T09:25:12.453Z`, installed Chrome `152.0.7977.83`. No API requests or unhandled browser errors were observed in the nine cases. Browser closed and its slot released. The specimen application files are frozen at the source hashes recorded in `results.json`.

## What changed

The rejected procedural bottle has been replaced by one existing clean, photoreal **generated illustration**. Its white cap, thin clear PET, visible fill line, ribbing and generic blue label come from the recovered Library asset. No new images were generated, and no model/provider credits were used.

The full-bottle view never receives a particle layer. The shoulder, label and ribs buttons, image click, position slider and 2×/3×/4× image enlargement move an actual square crop of that same loaded image. They do not simulate rotation or calibrated microscope magnification. The former rotation/drag controls and Three.js specimen implementation are removed.

The separate **Illustrative UV** detail draws a sparse set of small fibers/fragments over a subdued version of the same image crop. They are authored examples, not extracted or detected particles. The scan reveal, filtering and gentle motion are coded; there is no second bottle still or baked particle image. A persistent `Not a scan result` label, nearby explanation and scientific caveat make the distinction explicit. The research study count is not repeated as a bottle reading.

Macro detail draws on demand. UV motion pauses manually and stops requesting frames when the detail is offscreen, the document is hidden, reduced motion is active, or the component is disposed. Explicit detail changes still work while paused/reduced. Image failure offers a working retry. If Canvas is unavailable, the full bottle and descriptions stay available and unavailable detail controls are disabled.

## Files and asset provenance

- `src/components/atmosphere/specimen-inspector.tsx`: photo overview, detail controls, image error/retry and visibility lifecycle.
- `src/components/atmosphere/specimen-inspector.css`: ivory image plate, charcoal detail workbench, responsive controls and focus states.
- `src/components/atmosphere/bottle-scene.ts`: Canvas image crop and separate illustrative particle detail; no Three.js import.
- `src/components/atmosphere/specimen-fallback.ts`: removed obsolete 2D drawing of the rejected bottle.
- `public/media/ripple/specimen/retail-pet-clean.webp`: the sole served bottle asset, **1122 × 1402, 115,010 bytes**, SHA-256 `70453cef21fe746362d9bfa7b50968ec093443ef223848de99098069e9c13b97`.

`asset-provenance.json` records all original and optimized hashes. The exact reference is Library `file_000000009b9c81f5a955330656d41590` (`image(2).png`); the generic clean bottle is `file_00000000ca7c81f5b51b8eeaa48c86db` (actual Library filename `image-gen-1(4).png`). Both were read through Files, materialized to this worker's Linux container, and downloaded through one owned authenticated Library tab. Downloaded Windows bytes and the Linux originals have identical SHA-256 values. The Library tab was closed without touching the active conversation tabs.

The reference and original generated image are preserved under `assets/`. The branded Great Value reference is not served by the website. Optimization is WebP encoding only; no crop, recoloring, label retouching, or content replacement is baked into the asset.

## Verification commands

```powershell
node docs/qa/phase-e/specimen/prepare-assets.cjs

node node_modules/eslint/bin/eslint.js src/components/atmosphere/specimen-inspector.tsx src/components/atmosphere/bottle-scene.ts docs/qa/phase-e/specimen/prepare-assets.cjs docs/qa/phase-e/specimen/typecheck-specimen.cjs docs/qa/phase-e/specimen/review-specimen.cjs

node docs/qa/phase-e/specimen/typecheck-specimen.cjs

$env:PLAYWRIGHT_MODULE='C:/Users/ayada/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node docs/qa/phase-e/specimen/review-specimen.cjs

git diff --check -- src/components/atmosphere/specimen-inspector.tsx src/components/atmosphere/specimen-inspector.css src/components/atmosphere/bottle-scene.ts src/components/atmosphere/specimen-fallback.ts
```

Run the browser script only after the prime releases the shared slot. It uses one installed Chromium browser, sequential contexts and guaranteed closure. `results.json` records the exact source hashes, completed time, cases, request evidence and recording hashes. `typecheck-results.json` records the no-emit scoped TypeScript result. An optional `SPECIMEN_QA_CASES` filter is recorded in results and must not be mistaken for the complete suite.

The nine cases cover 1440×900, 1024×768, 768×1024, 390×844 and 320×568; idle/pause/offscreen/hidden/reduced-motion behavior; reduced motion at load; image failure/retry; and unavailable Canvas. Layout cases verify lazy loading of the real image, distinct source crops on region/enlargement changes, keyboard position input, changed UV/filter pixels, unchanged decoded bottle pixels/photo DOM/image styles between modes, absent rotation controls, 44px minimum targets and no scoped horizontal overflow. Every `/api/**` request is intercepted defensively; the isolated study must request none.

## Visual proof and interpretation

The full desktop/mobile workbench captures are `1440-workbench-macro.png`, `1440-workbench-uv.png`, `390-workbench-macro.png`, `390-workbench-uv.png`, and corresponding 1024/768/320 captures. `*-whole-bottle.png` shows the clean overview; `*-detail-shoulder.png`, `*-detail-ribs.png` and `*-detail-enlarged.png` show real image crops. `*-reveal.png`, `*-detail-uv.png` and `*-detail-fibers.png` document the coded illustration. Desktop and mobile unedited recordings are under `recordings/`.

The first browser run caught a harness URL normalization error: Next exposed an absolute image `src`, while the assertion expected a relative path. It did not indicate an image load failure. The assertion now compares the parsed pathname. Early `layout-*-failure.png` captures are retained as failure evidence; use final `*-workbench-*.png` captures and the current full `results.json` for the finished review.

One later run reported a strict image-element screenshot hash mismatch at 768px. Exact element screenshots also include viewport/compositor placement and overlapping UI; the precise pixel difference in that earlier capture was not isolated. The final full run therefore verifies the stronger source/structure invariants separately: identical decoded source pixels, identical photo subtree, and identical image filter/opacity/transform/blend styles, with before/after screenshots retained for visual review. It does not claim that every compositor screenshot is bit-identical. All five layouts pass those invariants.

These are development-server captures. The Next development indicator may appear. Mobile sizes are desktop Chromium emulation, not physical iOS/Safari testing. The hidden-document case uses a synthetic `document.hidden` value and `visibilitychange`, not native tab backgrounding. The image remains an illustration, the bottle does not rotate, and UV is neither a measurement nor a physically validated optical simulation. The hover/keyboard controls are real controls over image cropping and the authored detail, not live water analysis.

The hero/artwork/highlight renderer, counter, data, Kenny/about content, shared asset registry, package/config files and prior Phase D evidence were not edited. No commits, push, checkout/reset, DB changes or purchases were made.
