# Phase B source recovery checkpoint

The recovered original scene and the unfinished deterministic candidate are preserved. The candidate remains disconnected from the application. Source recovery and repeatable local pixels do not establish either a match to the supplied master artwork or continuity from a decoded video into a live renderer.

## Provenance and reproducibility

`particle-continuation-original.html` is the recovered original, retained unchanged. Its SHA-256 after normalizing CRLF to LF is `96b6c9f390d50bfafaee4b6fa8c5875251945c64f879d38accaab66e81850c49`. The builder and exporter reject an unexpected fingerprint before using it. Raw file hashes are recorded separately in new export metadata, because checkout line endings can change without changing the normalized source.

`render-continuation-original.py` is also retained unchanged. Its inspected SHA-256 is `28885e185e99e9ee3c37c8ecbb351a498d6e07f909cdee126daa0b7aa79b04d8`. It identifies the original local scene route as `/public/particle_continuation_driving_shot.html`, the historical repository as `C:\Users\ayada\Ripple-Effect`, and the historical frame output as `scratch/continuation_frames` in its artifact workspace. These paths come from the recovered script; this checkpoint does not assert a fresh byte comparison against the old workspace or archive.

The original has 17 registered particles (six fragments, five fibers, six granules) and nine motes. Its coordinates and motion functions are fixed. Three.js still creates random UUIDs; these identifiers are not pixel randomness. The new full-state exporter normalizes UUIDs consistently throughout its JSON so geometry references survive while equivalent exports avoid random identifier changes. It exports complete geometry attributes, indices, fiber curves, camera matrices, materials, lights, and analytic terminal translation/Euler rates, not merely screen-space anchor positions.

`scripts/phase-b-source-build.cjs` reproduces `src/lib/continuation-scene.js` and its declaration from the pinned original. Every text edit checks for exactly one source marker; TypeScript parses the result and identifies resource constructors for explicit ownership. The candidate retains the pre-existing material/subdivision experiment: ten subdivisions per source triangle, seeded weathering at seed 17329, altered blue tint/transmission, reduced edge opacity, and a 42-degree edge threshold. It also adds validated time/pointer inputs, camera-matrix refresh before projection, and idempotent disposal, including resources allocated before a setup failure. Edit the builder, not the generated module.

Local source QA requires installed Three.js `0.182.0`. Runtime module hashes, browser version, browser executable, Playwright version, and pixel hashes are saved with new evidence. Build `--check` verifies regeneration without writing. The generator changes only the two named source modules. The render/export utilities write only below this source-recovery folder; they do not accept arbitrary output paths.

`offline-tools.cjs` binds an ephemeral server to `127.0.0.1`, checks Host/Origin, permits only GET/HEAD, and serves fixed in-memory routes for the HTML and required local modules. Requested URLs never become filesystem paths. Invalid, encoded, traversal, prefix-sibling, and unrelated-file routes are rejected. Inputs and output ancestors reject links/junctions; evidence uses atomic replacement. Browser profiles, caches/download paths, and temporary QA files remain within this folder and are cleaned up. Page errors fail the run; browser requests to external origins are blocked. Local dependency/browser overrides must identify existing absolute local paths. No install or download is performed.

Existing `recovered-terminal.png` and `terminal-state-full.json` are retained as earlier recovery evidence. New runs use `original-export/` and `candidate-still/`, so that evidence is not overwritten. The removed automatic full-encode path is preserved as non-executed reference in [candidate-encoding-reference.md](candidate-encoding-reference.md).

## Visual limits

The inspected recovered terminal shows flat, straight-edged translucent/blue polygons, simple tube fibers, and faceted beads on a sparse dark backdrop. The supplied master shows crinkled film-like particles, detailed surfaces and irregular edges, fine fibers, denser atmosphere, brighter rays, and depth blur. The original's “Matching 01.png” comments express the original author's intent, not verified visual equivalence.

In the installed Three.js source, `ShapeGeometry` extracts the straight outline and triangulates it; the `curveSegments` argument does not subdivide the interior of straight-sided polygons. The original's six flakes therefore have only a handful of triangles. The candidate explicitly subdivides those faces, but it creates non-indexed geometry and computes normals per face. Direct inspection of `candidate-still/terminal.png` confirms conspicuous triangular surface faceting and dark filled flakes. Its texture and wrinkle displacement do not provide smooth shared normals or reproduce the master's crinkled translucency. `EdgesGeometry` may also reveal internal crease edges. Granules remain flat shaded, and neither source implements depth-of-field postprocessing. The candidate is an unfinished visual experiment, not approved replacement artwork.

## Color and frame-time limits

Both scene variants use a fixed 1920 × 1080 raster, pixel ratio 1, antialiasing, preserved drawing buffer, ACES filmic tone mapping, and exposure 1.15. The candidate explicitly selects sRGB output, matching the installed renderer's default. Its shared grayscale color/bump texture deliberately uses `NoColorSpace` as linear modulation; it is not calibrated albedo. The custom background shader is retained from the source and does not include the built-in color/tone-mapping fragment chunks. A browser sRGB profile is forced for the bounded checks. These settings need measurement through the actual production video/display path before claiming a match.

The recovered Python samples 120 frames at `tau = i / 119`, with scene time `4 * tau`. Encoded at 30 fps, terminal source frame 119 occurs at video PTS `119 / 30` (approximately 3.966667 seconds), while the scene state is exactly 4.0 seconds. At composite frame 257, the corresponding PTS is `257 / 30` (approximately 8.566667 seconds). The scene clock runs at `120 / 119` source seconds per video second between samples. Extending the candidate at an unadjusted wall-clock second per scene second does not establish matching terminal velocity.

Historical source capture used JPEG quality 0.95 before H.264 `yuv420p` CRF 17. Current checks capture canvas PNG before any encode. GPU/driver, browser, antialiasing, tone mapping, RGB/YUV range and transfer conversion, chroma subsampling, compression, video decode, scaling and compositing can all affect terminal pixels. Identical canvas pixels within one installed runtime are a bounded result, not a cross-runtime or decoded-video guarantee.

## Checks and reproduction

Run from the repository root with already-installed tools. The local Playwright package existed, but its bundled Chromium executable did not; the verified installed Chrome path is used explicitly. No browser was downloaded.

```powershell
node scripts/phase-b-source-build.cjs
node scripts/phase-b-source-build.cjs --check
node --test docs/qa/phase-b/source-recovery/source-tools.test.cjs
node node_modules/eslint/bin/eslint.js scripts/phase-b-source-build.cjs scripts/phase-b-source-export.cjs scripts/phase-b-source-render.cjs src/lib/continuation-scene.js src/lib/continuation-scene.d.ts docs/qa/phase-b/source-recovery/offline-tools.cjs docs/qa/phase-b/source-recovery/source-tools.test.cjs
$env:PLAYWRIGHT_MODULE = 'C:/Users/ayada/AppData/Local/Temp/ripple-browser-qa/node_modules/playwright'
$env:PLAYWRIGHT_BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/phase-b-source-render.cjs --still
node scripts/phase-b-source-export.cjs
```

The source tests cover path escape/link rejection, strict source markers, regenerated output stability, UUID reference normalization, local dependency input rejection, exact HTTP routes, malformed/traversal requests, method/Host/Origin restrictions, and server closure. The candidate still utility compares four terminal renders: initial, repeated, after seeking to optical black with terminal interaction inputs, and a fresh scene/canvas in the same browser. It also checks opaque black at time zero, invalid input rejection, repeated disposal, and rejection of methods after disposal. It never enters a 120-frame loop or invokes FFmpeg.

Saved evidence is authoritative about completed checks: `candidate-still/verification.json` and `original-export/verification.json`, when present, contain successful measured runs and their hashes. A failed run exits nonzero and does not replace success evidence; always pair an artifact with the terminal command result and module hash for the version under review.

For this checkpoint, the candidate still and seven source-tool tests completed successfully. The fresh original-export command was blocked before execution by the tool dispatch safety-status check, including the prime's retry. No `original-export/verification.json` was produced. The exporter therefore has source/unit-test coverage but no fresh browser-run verification; the older `terminal-state-full.json` and `recovered-terminal.png` remain preserved, explicitly older evidence.

The completed candidate run used Chrome `152.0.7977.83`, Playwright `1.63.0`, and AMD Radeon graphics through ANGLE Direct3D11. All four terminal RGBA captures had SHA-256 `215c73ef07472f3f565f9ed869c474c6ad638f066c519d43474097239c177609`; the saved terminal PNG has SHA-256 `69e73449d7e4dd552494835810a7f4b12ff0170150333d072bc1d8b54c8ab7db`. Opaque black and every input/disposal assertion passed. The generated scene hash in that evidence is `53e5e1dd273c53de200f30d13fbb8731f1a01ca3edc2ac1f90227daab14c79db`.

The attempted fresh original-export command was blocked before execution by tool dispatch because its safety status could not be determined. That is a validation limit for this checkpoint, not a renderer result. The new exporter's browser execution is unverified here; earlier `recovered-terminal.png` and `terminal-state-full.json` remain the original evidence. No fresh original-export success is claimed.

## Missing live handoff proof

Before a live renderer can replace the exact terminal-static fallback, the following evidence is still needed:

1. Approval of the candidate's materials, shape detail, lighting, depth, and composition against the supplied master.
2. A deliberately produced video using the approved shared scene, with recorded input/source hashes, geometry, camera, seed, renderer settings, frame sampling, and encode/decode color pipeline. No such candidate encode was made here.
3. Direct comparison of the final decoded video frame with the first live rendered frame through the actual display path, at the same viewport, aspect/crop, pixel ratio, exposure, color treatment, and camera/particle state. A regenerated pre-encode terminal PNG is insufficient.
4. Measured continuity across the boundary for camera translation/orientation and particle translation/rotation, with the `120 / 119` time mapping accounted for. The source exporter records no measured terminal camera angular velocity and no decoded-video motion comparison.
5. Review of the real controller/browser handoff, seeking/replay, resize and supported GPU/browser behavior. The offline candidate has no controller imports and no runtime handoff integration in this checkpoint.

The supplied timing proof and exact terminal-static fallback therefore remain the application behavior. This checkpoint does not promote the candidate, modify the media registry, or claim seamless continuity.
