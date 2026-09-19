# Phase B: artwork integration and honest motion handoff

**Status: static-handoff integration checkpoint. The live-renderer visual-match gate remains open.**

This work continues `agent/cinematic-water-v2` / PR #2 from reviewed commit
`9ca9db122229d4054293a98572e94b38af577072`. The existing artwork commit `4e84e82`
was preserved. No database migrations, seeds, production merges, force pushes,
generative-service calls, or purchases are part of this checkpoint.

## What the application actually displays

The supplied particle master is the initial hero artwork. The fibers, fragments,
and granules cards form an educational atlas after the search results; the
portrait slide image sits beside the sample-examination text. `#sample-study`
now resolves to that examination section. The figures remain explicitly
illustrative, not measurements of the visitor's water.

The isolated study's contribution link now returns to `/#submit`, where the
main application owns the submission route, rather than a nonexistent study
anchor. The main page retains its existing `#submit` navigation.

The home page and isolated `/motion-study` share `TankHero`, `CinematicIntro`,
and `HeroParticleStage`. Search stays real HTML; the study's search demonstrates
input preservation without fabricating results or calling backend endpoints.

Playback is explicit. The journey is not automatically started on arrival,
on a returning session, or by a deep link. Reduced-motion users can continue
without playback. Watch brings the media rectangle into view on mobile rather
than depending on the test harness to scroll it. Skip and Escape exit the
player; Pause/Resume and offscreen/visibility suspension preserve user intent.
Late playback promises cannot revive a released player or terminate a newer
play attempt. Focus returns to the search when the focused player disappears,
without interrupting another control already in use.

The stage preserves the full 16:9 video rectangle. Editorial content is below
the stage on smaller layouts, not baked into video pixels. Text reveal follows
presented media time where `requestVideoFrameCallback` is available, with a
less precise `timeupdate` fallback. Missing media/artwork leaves usable HTML
and an explicit unavailable message.

## Exact poster is not a live match

The delivery video remains `intro-proof-1080.mp4`: 1920×1080, 30 fps, 258 frames,
8.6 seconds. Its manifest labels it `TIMING_PROOF_NOT_FINAL_ART`. The existing
edit trims only the documented near-black boundary frames; the approved
microscope shot is not replaced by a procedural microscope or a CSS iris.

After playback the application uses `continuation-terminal-proof.webp`, not
the visually different particle master. The visible status is:

> Static prototype fallback · exact final video frame. Live particle match pending.

`phase-b-poster-match.cjs` independently decodes the opening frame and terminal
frame 257 from the shipped MP4 and compares every RGB channel with the posters.
Both comparisons have zero mismatched channels. This proves decoded-file pixel
equality only: it is not a cross-browser color-pipeline test, nor proof of a
video-to-live WebGL transition.

The recovered source and unfinished material candidate are retained under
[`source-recovery/`](source-recovery/). The generated `continuation-scene.js`
module remains disconnected from the application. A deterministic render in
one installed runtime does not establish a match to the master, an encoded
video, other GPUs, or a live first frame. Do not enable it on that basis.

## Verification and evidence

Machine-readable results and command output live in [`checks/`](checks/).
Browser observations, screenshots, and recordings live in [`browser/`](browser/).
Source-specific verification is kept separate under `source-recovery/`.

The final local browser run completed **24/24 checks** in Chrome
152.0.7977.83. All five requested sizes passed with matching video/stage
rectangles, no horizontal overflow, zero Watch/Skip overlap, and successful
requests for all five supplied artworks. Watch is tested without a compensating
harness scroll. Homepage controls are hit-tested before Playwright can scroll
them into view; the real page now accounts for its sticky header.

The two complete, unedited recordings play the journey at rate 1, reach a
trusted natural `ended` event at 8.6 seconds without seeking, and then demonstrate
HTML search, atlas navigation, and the separate specimen's UV/rotation controls:

- [Desktop, 1440×900](browser/recordings/desktop-journey-and-interactions.webm)
- [Mobile, 390×844](browser/recordings/mobile-journey-and-interactions.webm)

These demonstrate a static hero handoff, not interactive hero particles. Their
SHA-256 hashes and successful interaction assertions are in `browser/results.json`.
The isolated study cases made zero API requests; each actual-home case used
eight intercepted GET requests and made no real backend call. The real deployed
database/schema was neither changed nor revalidated by these fixture checks.

The fresh native 200% browser-zoom check also passed: DPR 2, CSS `zoom: 1`,
visual viewport scale 1, 709×401 CSS viewport, and no horizontal overflow.
See `browser/browser-zoom-200.json` for keyboard/geometry evidence and capture
details. These are installed-Chrome results, not a cross-browser certification.

The reveal observations showed that presented `mediaTime` and the contemporary
`video.currentTime` can differ slightly. The test validates the presented media
clock when frame callbacks exist, and validates `currentTime` for the
less precise `timeupdate` path. Raw events are saved before assertions; the
test does not silently lower the 7.5-second cue threshold.

Full-repository lint reports **61 errors and 3 warnings**, all in files
unchanged from the reviewed commit according to `checks/lint-baseline.json`.
Scoped lint for this work passes; the repository-wide result is not clean.

The full Git whitespace check reports only preserved original renderer sources,
their reproducibly generated scene copy, and captured build/lint output. These
are retained rather than rewriting source fingerprints or terminal evidence;
the authored implementation passes the check with those five exact files excluded.

The automated checks distinguish:

- Unchanged hashes for all five supplied stills, responsive variants, and the
  shipped timing proof; exact decoded opening/terminal posters.
- Existing provenance/cohort, public-read safety, report-assessment, unit-scale,
  and pre-averaging regressions, using fixture data and injected database stubs.
  The write detector is itself tested with a negative control.
- TypeScript, scoped lint, and a production build with seeding disabled and a
  deliberately unavailable loopback database URL. No real database is needed.
- Browser evidence at 1440×900, 1024×768, 768×1024, 390×844, and 320×568,
  plus zoom and controller failure/lifecycle cases. Consult the browser result
  file for the exact checks completed; do not substitute older Phase A reports.
- Full-repository lint separately from scoped lint. `lint-baseline.json`
  compares files with diagnostics against the exact reviewed Git blobs before
  describing failures as pre-existing. Full lint is not claimed clean.

The initial saved browser harness manually scrolled the stage after Watch,
which concealed an actual mobile-start defect. The page interaction was fixed,
and the expanded harness must verify Watch without that compensating scroll.
Earlier `watch-before` artifacts are failure evidence, not acceptance screenshots.

The fixture-suite runner uses the already-installed Jiti dependency with
explicit TypeScript alias resolution and transformed CJS entrypoints. A direct
native-CJS invocation on this Node runtime does not resolve the application's
extensionless TypeScript imports; this is why `run-regression.cjs` is included.
It does not replace or relax any existing test assertion.

## Reproduce locally

Use the existing project dependencies, FFmpeg, and an installed Playwright
runtime. Set `PLAYWRIGHT_MODULE` only when Playwright is outside this checkout.
The commands do not install packages or run Prisma migrations.

```text
node scripts/qa/phase-b-checks.cjs --full-lint --build
node scripts/qa/phase-b-lint-baseline.cjs
node scripts/qa/phase-b-browser.cjs
node scripts/qa/phase-b-zoom.cjs
```

The browser harness defaults to `http://localhost:3020`; `QA_BASE_URL` selects
an already-running server. Start a local server only when one is not running:

```text
node node_modules/next/dist/bin/next dev -p 3020
```

Use the source-recovery instructions for bounded offline candidate checks.
Do not overwrite public media with a candidate, claim particle interactivity
for the static hero, or describe this checkpoint as a seamless final-art handoff.
