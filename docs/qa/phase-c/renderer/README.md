# Phase C: interactive approved artwork

The renderer now uses the approved particle-world image itself. It does not use
the recovered Phase B polygons, procedural materials, dot sprites or WebGL
triangles. The original source files and previous evidence are preserved.

## Implementation

`src/lib/artwork-field.ts` provides the contract in [API.md](./API.md). Seventeen
fixed, manually annotated crops retain the master's actual translucent edges,
fiber detail, granules and surrounding water. Their outer water margins are
feathered; the subjects remain inside the opaque central part of each crop.
Small bounded translations cover the original subject location with its own
image patch. This is image deformation with surrounding-water blending, not
semantic segmentation, isolated transparent objects or physical scattering.

The camera/opacity entrance uses quintic easing from a small pullback (scale
.94) to the master framing (scale 1), around the existing particle area. Local
depth annotations create small inward-to-settled offsets. First and second
derivatives of the entrance contribution go to zero at both endpoints. Source
time then gives restrained deterministic drift. Pointer displacement and
externally decayed tap impulse act on these same real image patches. No internal
RAF, timers, input listeners or network requests are created.

`entrance=0` draws only the decoded boundary. `entrance=1,time=0,category=all`
without interaction draws the master exactly at the chosen cover framing. The
desktop retains its dark left-side composition; portrait centers the existing
particle region at source x=.755. Portrait therefore crops the original image;
it does not recreate the landscape composition in a new aspect ratio.

Category selection dims other artwork to emphasize annotated regions. Motion
crops stay at the same exposure as the surrounding field. Selected detail then
uses a separate alpha matte: a smooth elliptical envelope, zero at its perimeter,
multiplied by the source image's luminance above a surrounding-water estimate.
The estimate uses the 85th-percentile luminance in the outer part of the crop;
the highlight has a smooth 36-level transition above that floor. Original RGB
values are retained. This prevents the old full-bright rectangular water patches
around selected granules, and avoids replacing them with uniformly lit ellipses.
Mask pixels are read once during construction and cached; there is no per-frame
readback or synthetic highlight color.

The labels and luminance matte are educational art annotations, not particle
detection, counts, concentrations, physical dimensions or water-quality
measurements. Product copy should call this **interactive artwork** or an
**illustration**.

## Original microscope recovery

The prime recovered the original Library download and placed it unchanged at
`public/media/ripple/live/microscope-original.mp4`. Searches in the accessible
repository/work kit had found only the earlier combined timing proof. Native
reads of external Downloads/Codex asset folders were denied by the approved-root
guard; the renderer worker did not bypass that denial or remake the clip.

The source is 1,653,270 bytes, 1920 by 1080, 150 frames at 30 fps, and 5 seconds.
Its SHA256 is
`122d925177afe1267ca1a038dccd352385ebddefe409b65bcdf0d1388e0de9d3`.
`scripts/phase-c-artwork-assets.cjs` pins both that hash and the expected size,
checks the decoded frame count/dimensions/rate/duration, and preserves the MP4.
It accepts only a local workspace input and writes only the fixed live asset
names plus the renderer QA manifest. Existing differing outputs cause an error
instead of an overwrite. No installs, generation or external service is used.

The prime ran that extraction script; the worker subsequently ran `--check`:

| Artifact | Exact source frame | Source PTS | Result |
| --- | ---: | ---: | --- |
| `microscope-opening.webp` | 0 | 0 s | Lossless copy of FFmpeg-decoded RGB; mean channel 54.2822 |
| `microscope-terminal.webp` | 149 | 4.9666667 s | Lossless copy of FFmpeg-decoded RGB; every RGB channel is zero |

The original H.264 uses full-range `yuvj420p` with `bt470bg` color-space metadata.
Those original bytes/tags are unchanged. Endpoint extraction decodes to RGB24
and stores that raster as lossless WebP. It does not silently normalize the MP4
to limited-range BT.709. Exact SHA hashes, stream metadata, endpoint channel
statistics and FFmpeg version are in [assets.json](./assets.json).

The master remains the existing 1672 by 941 WebP, SHA256
`709915746e83fbaedd748066d71a9dcefac11dad0bf825af5a6ebdba9f789616`.
No original media, prior registry, controller, hero or page file was edited by
this renderer task.

## Isolated verification

[verification.json](./verification.json) records the completed isolated run in
local Chrome 152.0.7977.83 / Playwright 1.63.0. One browser was used at a time,
with only fixed loopback resources allowed, then closed with its context and
temporary profile. The final run used the newly recovered original terminal
poster and also tested a nonblack original-opening boundary fixture.

| Check | 1440 x 810, DPR 1 | 390 x 844, DPR 1.5 |
| --- | --- | --- |
| Entrance-zero boundary versus independent cover draw | 0 changed pixels | 0 changed pixels |
| Settled time-zero master versus independent cover draw | 0 changed pixels | 0 changed pixels |
| Repeated interaction after other frames | 0 changed pixels | 0 changed pixels |
| Pointer response | 91,801 changed pixels | 157,259 changed pixels |
| Separate local entrance offsets | 17 distinct offsets | 17 distinct offsets |
| Measured JS draw-submission p95 | about 0.6 ms | about 0.9 ms |

Drift, tap impulse and category dimming changed the image. The nonblack opening
fixture also returned to an identical boundary after an intermediate entry and
interaction frame. Invalid times, pointers and dimensions were rejected;
double disposal was safe, all 52 owned cache canvases were released, and calls
after disposal were rejected. No browser errors occurred. The isolated camera
easing endpoint finite-difference checks passed.

QA reads PNG snapshots into a separate temporary readback canvas. Repeated
direct `getImageData` calls on the renderer during the earlier exploratory run
produced small scaled-image differences after repeated draws; avoiding intrusive
renderer readback keeps capture and timing separate from rendering. The final
nonblack-boundary roundtrip and settled-master comparisons both passed exactly.
The production renderer performs no per-frame pixel readback.

The recorded performance samples use 30 owner-driven frames per viewport after
warmup. Owned image-cache estimates were about 8.51 MB on desktop and 6.81 MB on
mobile. These are approximate canvas backing bytes, not complete browser/GPU
memory measurements. Timings are JS draw submission and owner RAF intervals,
not GPU completion, display latency or a guarantee for every device.

### Category-mask finishing regression

The followup to repository HEAD `1483d0ad1a881412b5d3dcf5dee4954dfbd6878c`
adds tests for the reported visible crop boxes. Each category is compared with
the same moving artwork dimmed uniformly. Crop-corner water outside every
selected ellipse must not receive a visible brightness lift; selected subject
detail must still brighten. The allowed edge-rounding lift is 3/255. All six
views measured a maximum of just 1/255:

| Category | Desktop corner samples | Mobile corner samples | Maximum channel lift |
| --- | ---: | ---: | ---: |
| Fibers | 3,168 | 3,079 | 1/255 |
| Fragments | 1,321 | 2,974 | 1/255 |
| Granules | 471 | 986 | 1/255 |

A separate uniform-water image, served from a fixed loopback route, is checked
at times 0 and 8 with pointer displacement in all three filters. It must remain
uniformly dim: this catches both rectangular patches and elliptical spotlights.
All six cases stayed within 1/255 rounding of the independent dimmed reference.
The granules view still had 5,590 desktop and 11,061 mobile pixels more than eight
channel levels above the dim baseline, so the fix did not merely hide highlights.

All six filtered-frame repeats in the final run had zero changed pixels.
One exploratory run stopped on an exact filtered-frame repeat assertion; the
diagnostic rerun passed without relaxing that assertion. The cause of the isolated
failure was not established. The saved result demonstrates final-run repeatability,
not a guarantee of identical raster output across every run, browser or GPU.

The final source SHA256 recorded in `verification.json` is
`c79296e389262a7e89789bac31bc765a33b1cfe9be9cf454421bf05a1023b328`.
The browser and context closed, all owned canvases were released, and no QA
browser-profile directories remained after the run.

## Visual inspection and remaining limits

All three categories are saved and inspected at both sizes:
`desktop-fibers.png`, `desktop-fragments.png`, `desktop-granules.png`,
`mobile-fibers.png`, `mobile-fragments.png`, and `mobile-granules.png`.
`desktop-granules-details.png` and `mobile-granules-details.png` enlarge the
granule areas for perimeter inspection. Fine irregular translucent fragment
edges, curved fibers, granule shapes and dark water remain visible. The selected
granules no longer sit inside rectangular patches of brighter water. No triangle
tessellation is introduced; illustrated irregular surfaces remain source pixels.

Ordinary motion still uses feathered rectangular coverage, while category
restoration uses the image-derived elliptical matte. Annotated crops can include
nearby light detail; this is not a semantic segmentation mask. Displacement stays
small to avoid exposing the original subject. Strong deformation, arbitrary
camera orbit, object-level relighting and volumetric refraction are unsupported.
The image-camera entrance is a deliberate 2.5D artwork transition from optical
black, not evidence of continuous 3D microscope motion.

FFmpeg endpoint RGB equality, isolated canvas boundary equality and the page's
actual video-to-canvas handoff are separate checks. Browser video decoding and
color management can differ from FFmpeg. The terminal's decoded black raster
has been established here; the prime owns integrated playback timing,
paint-to-paint handoff, accessibility, pause/resume and page acceptance tests.
Cross-browser/GPU pixel equivalence has not been established.

## Reproduction commands

From the repository in PowerShell, using already installed tools:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/Users/ayada/AppData/Local/Temp/ripple-browser-qa/node_modules/playwright'
$env:PLAYWRIGHT_BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node docs/qa/phase-c/renderer/check.cjs

$env:FFMPEG_PATH = 'C:/Users/ayada/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe'
node scripts/phase-c-artwork-assets.cjs --check

node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target es2020 --module esnext --moduleResolution bundler --lib dom,es2020 src/lib/artwork-field.ts
node node_modules/eslint/bin/eslint.js src/lib/artwork-field.ts docs/qa/phase-c/renderer/check.cjs
```

The renderer check, strict TypeScript and scoped lint completed successfully for
the category-mask followup. The read-only asset check above belongs to the initial
Phase C verification; this followup changed no public media or extraction script.
To extract from an original already recovered inside the workspace, use
`node scripts/phase-c-artwork-assets.cjs --source path/to/original.mp4`.
The script never rebuilds or re-encodes the source video.
