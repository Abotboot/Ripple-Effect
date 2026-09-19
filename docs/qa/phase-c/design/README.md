# Phase C atlas and research design review

Worker 2 scope, based on `e7269d8` on `agent/cinematic-water-v2`. Final local review completed at `2026-09-19T04:22:58.418Z` with installed Chrome `152.0.7977.83` through Playwright. `design-results.json` reports **7 passing cases, zero failures**. The browser was closed after the review.

## Changed files

- `src/components/sections/particle-atlas.tsx` and `particle-atlas.module.css`: three image tabs select specific observations, identification limits, and sample-record guidance. Left/Right, Home/End, wrapping, roving tab focus, native pointer activation, and a focusable associated panel are supported. All three approved images remain visible and lazy-loaded; images are not cropped or altered. Selection has both a text label and a border treatment.
- `src/components/atmosphere/water-narrative.tsx` and `water-narrative.css`: sample documentation, a separate sourced research finding with limitations, and contribution. Removed the opening slogan section, body-route sequence, scroll pinning, split-text reveal, animated particle counter, and decorative refraction filter. The number is a static approximate study average. The component no longer needs its own client lifecycle or GSAP imports.
- `src/components/site/tank-system.css`: charcoal surfaces and ivory text; quiet aqua accents scoped to dark navigation and the real search section. Data primary, chart and warning colors remain outside those overrides. The atlas is excluded from the broad homepage foreground/title rule so it remains readable in the light site theme.

No optional workbench was added; its useful comparison function lives in the atlas. No hero, controller, page, home-section, asset registry, original image, package script, renderer, or database changes were made by this worker.

## Integration contracts

`particle-atlas-title`, `#specimen-study`, `#sample-study`, `particle-title`, `siphon-title`, and `countermeasure-title` remain available. `siphon-title` now labels the research context rather than a body journey. The unused internal body-route IDs and opening `illusion-title` were removed with those sections.

The atlas has exactly one specimen link, still targeting `#specimen-study`. Its visible text is now **Try the specimen controls**. The three image filenames and `loading="lazy"` are unchanged. `ParticleAtlas()` still accepts no props.

`WaterNarrative({ contributeHref = '#submit' } = {})` remains compatible with the homepage and with the study route's `contributeHref="/#submit"`. The NIH source URL, 2024/three-brand context, approximate 240,000 total, 90% nanoplastic share, sample variation and exposure/health limitations remain present. The number is separated from the illustrated sample and is never animated from zero. No new biomedical or legal findings were introduced.

## Validation

```powershell
node node_modules/eslint/bin/eslint.js src/components/sections/particle-atlas.tsx src/components/atmosphere/water-narrative.tsx docs/qa/phase-c/design/review-design.cjs

$env:PLAYWRIGHT_MODULE='C:/Users/ayada/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node docs/qa/phase-c/design/review-design.cjs

git diff --check -- src/components/sections/particle-atlas.tsx src/components/sections/particle-atlas.module.css src/components/atmosphere/water-narrative.tsx src/components/atmosphere/water-narrative.css src/components/site/tank-system.css
```

All commands exited 0. Git emitted the repository's LF/CRLF notices; there were no whitespace errors.

| Case | Result |
| --- | --- |
| `/motion-study`, 1440 × 900 | Keyboard/pointer selection, focus, image decoding, anchors, layout passed; zero API requests. |
| `/motion-study`, 768 × 1024 | Same checks passed; zero API requests. |
| `/motion-study`, 390 × 844 | Same checks passed; zero API requests. |
| `/motion-study`, 320 × 568 | Same checks passed; zero API requests. |
| `/motion-study`, reduced motion | Category selection remains usable; tab transition is 0s; no narrative animation; static study number; no video; zero API requests. |
| `/`, dark theme | Every API request intercepted with empty fixtures; header/search primary is `#a9cdc4`; root and benchmark primary remain `#1df2b3`. |
| `/`, light theme | Every API request intercepted with empty fixtures; header/search/benchmark retain the light root primary. Atlas heading remains ivory on charcoal. |

Each of the four study layouts received HTTP 200 for the actual fibers, fragments, granules, and specimen-slide image and decoded them. Each has one selected tab, one visible associated panel, and one tab stop in the tablist. No atlas or narrative element extends horizontally outside the viewport. Every new tab/link control is at least 44 CSS pixels high.

The two homepage cases each intercepted six GET requests. They do not validate real backend data, search responses, or write flows. The scope's scientific copy is adapted from the existing supplied text and source link; this review is not a new literature verification.

## Visual evidence

Locally inspected screenshots include:

- `1440-atlas-fibers.png`, `390-atlas-fragments.png`, `320-atlas-fragments.png`: all three illustrations, selection state, readable observation/limitation panel.
- `1440-sample-record.png`, `768-sample-record.png`: preserved portrait artwork alongside practical sample metadata.
- `1440-research.png`: independent study average and adjacent limitations.
- `390-contribute.png`: compact contribution copy and 49px action.
- `home-light-atlas.png`: ivory atlas copy is not overridden by the light theme.

The complete captures for all four sizes and both homepage themes sit next to this document. These are section captures from the development server; the Next development indicator and existing floating site controls can appear. No screenshot is evidence of a live particle renderer or a measured sample. Mobile dimensions use desktop Chromium emulation, not a native iOS/Safari device.

Prime owns the integrated Phase C browser regression, production build and safety checks. This worker made no commits.

## Final integration handoff

After prime's integration update, the scoped ESLint command and scoped `git diff --check` above were run again and exited 0. The five application files in this review required no further changes. No browser was opened for this follow-up; the browser slot remains available to the source worker and prime's integrated app harness.

The seven browser cases and screenshots retain their original capture time. They validate the atlas, narrative, and scoped theme changes, not the completed hero integration. The raw media log also contains a 404 for `/media/ripple/live/microscope-terminal.webp` while integration was in progress; that request is outside the four design assets asserted by this review. The fresh app harness must establish the completed journey's asset and playback status.
