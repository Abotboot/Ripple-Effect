# Phase F polish handoff

- Worker: `worker-4`
- Chat/conversation ID: not exposed by the available worker tool, so none is guessed here.
- Browser QA: not run; browser use remained explicitly unauthorized for this task.

## Changed files

- `src/components/sections/home-section.tsx`
  - Kept the existing search-first hierarchy and explicit service-error / `Try again` state unchanged.
  - Tightened the microplastics, funding, data-source, and GitHub copy to remove repetitive or absolute wording.
  - Kept the home donation entry visible and renamed its CTA to `View funding plan`.
  - Added a reduced-motion utility to the touched donation CTA transition.
- `src/components/sections/donate-section.tsx`
  - Preserved the existing loading / available / unavailable funding states and `Retry total` behavior.
  - Replaced `secure`, `live`, and universal-open-access wording with narrower source/status language.
  - Added `aria-busy` while the HCB total is loading and clarified checkout review copy.
- `src/components/sections/donation.css`
  - Added restrained hover/focus/reveal transitions for donation controls.
  - Added explicit `:focus-visible` treatment and a `prefers-reduced-motion: reduce` override.
- `src/components/site/site-header.tsx`
  - Used the actual owned path under `src/components/site/` (the task's `src/components/layout/` path does not exist in this checkout).
  - Kept the dedicated Donate control visible, removed the external-link glyph from its internal navigation action, cleaned formatting, and hid the animated scroll-progress bar for reduced-motion users.
- `src/components/site/site-chrome.css`
  - Added short color/background/border transitions for navigation while retaining the existing global reduced-motion override and focus-visible treatment.

## Checks

- `./node_modules/.bin/eslint.cmd src/components/sections/home-section.tsx src/components/sections/donate-section.tsx src/components/site/site-header.tsx` — passed with no output.
- `git diff --check -- src/components/sections/home-section.tsx src/components/sections/donate-section.tsx src/components/sections/donation.css src/components/site/site-header.tsx src/components/site/site-chrome.css` — passed; Git only emitted the repository's LF/CRLF working-copy advisory.
- Targeted source assertions confirmed:
  - water-search failure state still contains `Water records are temporarily unavailable` and `Try again`;
  - donation total still exposes `Total unavailable` and `Retry total`;
  - reduced-motion and focus-visible hooks are present in the touched surfaces.
- Targeted search for the removed phrases `secure checkout`, `live HCB total`, `whole project is open`, `every database`, and `open to everyone` returned no matches in the scoped TSX files.

## Limits

- No browser, screenshot, visual-regression, or interaction QA was performed.
- No APIs, scoring/provenance, map behavior, hero/player files, media, dependencies, database code, or other workers' Phase E files were changed.
- No git-changing command, commit, push, merge, or deploy was run.

## Revived Phase F editorial/product pass

### Additional changes

- `src/components/sections/home-section.tsx`
  - Split utility-score loading from utility-location search. A score request failure now renders an explicit assessment error with `Retry assessments` while the independently fetched utility locations remain visible and usable.
  - A utility only shows `Unassessed / No data` after the assessment request succeeds and no eligible score exists. Missing assessment data no longer falls through to a score, regional estimate, or implied pass state.
  - Added a neutral missing-data action labeled `Testing & contribution options`, routed to the existing Submit Reading section.
  - Gated the `Above health guideline` statistic behind `sampleAssessment.healthCompared > 0`; zero comparable reviewed readings now render the existing unassessed dash/hint instead of a potentially misleading numeric zero.
  - Recent activity, recent utility locations, and citizen readings now distinguish real fetch failures from true empty states and expose `Retry activity`, `Retry locations`, and `Retry readings` respectively.
  - Moved source/review counts ahead of the explanatory quality note and collapsed the repeated generic caveat into one contextual paragraph while retaining the individual review-state labels/counts.
  - Passed the existing Data Sources navigation callback into the particle atlas and water narrative as a shared `Methodology & sources` action.
- `src/components/sections/particle-atlas.tsx`
  - Preserved all three existing artwork cards and keyboard tab behavior.
  - Shortened category-specific illustration disclaimers to details unique to each form.
  - Consolidated the generic artwork boundary into one footer note: form alone cannot identify material, source, concentration, or risk.
  - Added the shared `Methodology & sources` action while preserving the existing `Try the specimen controls` anchor.
- `src/components/sections/particle-atlas.module.css`
  - Added a compact footer-link group and button-safe styling for the shared methodology action; existing reduced-motion behavior remains intact.
- `src/components/atmosphere/water-narrative.tsx`
  - Preserved the existing specimen image placement, 2024 bottled-water research block, study-specific caveats, contribution section, and `ParticleStudyCounter`.
  - Shortened repetitive specimen/artwork disclaimers into one contextual boundary and added the shared `Methodology & sources` action.
- `src/components/atmosphere/water-narrative.css`
  - Made the shared methodology button use the same link styling and extended focus-visible/reduced-motion handling to buttons as well as anchors.

### Revived-pass validation

- `./node_modules/.bin/eslint.cmd src/components/sections/home-section.tsx src/components/sections/donate-section.tsx src/components/site/site-header.tsx src/components/sections/particle-atlas.tsx src/components/atmosphere/water-narrative.tsx` — passed with no output after removing redundant effect-side error resets flagged by React lint.
- `git diff --check --` across all expanded owned source files — passed; only the repository LF/CRLF advisory was emitted.
- Source assertions confirmed:
  - assessment fetch failure preserves locations and exposes `Retry assessments`;
  - true missing assessment renders `Unassessed`, `No data`, and no score;
  - health-guideline comparison only renders numerically when `healthCompared > 0`;
  - independent activity/location/citizen-reading errors expose explicit Retry actions;
  - `ParticleStudyCounter` is still mounted in the research area and its source remains `TOTAL = 240_000`;
  - the active owned TSX surfaces contain no prototype, continuation-proof, Phase-status, or versioned media-filename copy leaks.

### Read-only product findings

- The task text named `src/components/atmosphere/particle-atlas.tsx` / `.css`, but the current PR3/local tree uses `src/components/sections/particle-atlas.tsx` and `particle-atlas.module.css`; only the actual live files were edited.
- No vector/snapshot fallback implementation exists in the owned atlas/narrative surfaces, so there was no owned path that could fabricate a snapshot on vector failure. The separate D3 contaminant visual remains outside this worker's ownership and was not edited.
- The 240,000 bottled-water study counter and its motion/reduced-motion controls live in `particle-study-counter.tsx`; that file was inspected read-only and left unchanged.
- Browser QA was later authorized after worker-5 reported `browserClosed=true`; final merged result is documented below.

## Browser QA — actual run

Prime later confirmed worker-5's authoritative intro browser run was complete with `browserClosed=true`, explicitly releasing the browser slot. Worker-4 ran the guarded polish harness against the current local `http://localhost:3020` tree with the intro session-bypassed via `sessionStorage['ripple-entered'] = '1'`. Hero/player behavior was not exercised or asserted.

### Browser identity / closure

- Chrome: `152.0.7977.83`
- The initial full headless Chrome process closed in its `finally` block. Prime then explicitly authorized one minimal targeted retry process for the two incomplete contexts; that process also closed cleanly. They were never concurrent.
- The first Node command failed at module resolution because repo-local `playwright` is absent; it did **not** launch Chrome. The actual browser run used the already-installed Playwright package at `C:/Users/ayada/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`.
- Final process check: no `phase-f-polish-browser.cjs` Node process remains.

### Final merged browser result — 7 / 7 PASS

1. **Desktop editorial/product baseline** — PASS, 1440×900.
   - Header Donate visible; document `scrollWidth = 1440` at `innerWidth = 1440`.
   - Local `/api/stats` was independently observed as HTTP 500, so this context deterministically routed only `/api/stats` to the existing `statsFixture`; count/review UI placement is fixture-validated rather than a claim of live local stats availability.
   - `Samples` stat rendered and the evidence card visibly exposed `Verified 20`, `Provisional 8`, `Citizen 5`, `Unreviewed 7`, `Illustrative 2` before the consolidated contextual note.
   - Atlas click + ArrowRight keyboard selection passed; atlas `Methodology & sources` navigated to `Integrated data sources`.
   - Water narrative `Methodology & sources` navigated correctly and the study counter remained `≈240,000`.
   - Specimen whole-bottle overview had no canvas/SVG particle overlay; Illustrative UV remained in the separate detail canvas and showed `Not a scan result`.
   - Owned home/atlas/narrative visible-copy leak assertion passed.
   - Evidence: `browser/desktop-home.png`, `browser/desktop-counts-review.png`, `browser/desktop-atlas.png`, `browser/desktop-study-specimen.png`.

2. **Assessment error → true missing** — PASS, desktop 1440×900.
   - Forced `/api/utilities/scores` failure kept the independently loaded `QA Water Utility` location visible.
   - `Assessment data could not be loaded` and `Retry assessments` rendered without a score/pass state.
   - Retry returned an empty eligible score set and the card changed to `Unassessed / No data` with `Testing & contribution options`.
   - Evidence: `browser/desktop-assessment-error.png`, `browser/desktop-unassessed.png`.
3. **Independent home feed errors + Retry** — PASS, desktop 1440×900.
   - Activity, recent utility locations, and citizen readings each rendered explicit error/Retry states rather than empty-state copy.
   - All three recovered after their deterministic fixture was switched healthy and Retry was clicked.
   - Evidence: `browser/desktop-feed-errors.png`.
4. **Donation total unavailable + Retry** — PASS, desktop 1440×900.
   - Header Donate remained visible.
   - HCB failure rendered `Total unavailable` + `Retry total`, never fake `$0`.
   - Retry recovered to deterministic `$1,234.56`.
   - Desktop donation view had no horizontal overflow and no owned prototype/status-copy leak assertion failure.
   - Evidence: `browser/desktop-donate-unavailable.png`, `browser/desktop-donate-recovered.png`.
5. **Map background/vector failure** — PASS, desktop 1440×900.
   - Forced US-atlas background failure rendered the real error and `Retry map background`.
   - `All utilities (2)` remained usable with both deterministic utility names.
   - The checked map section contained zero canvas/snapshot-image substitute nodes (`fakeSnapshotNodes: 0`).
   - Desktop map failure view had no horizontal overflow.
   - Evidence: `browser/desktop-map-background-error.png`.
6. **Reduced motion** — PASS, 390×844.
   - Browser-computed header Donate transition duration: `0s`.
   - Browser-computed atlas-card transition duration: `0s`.
   - 240,000 study counter remained readable; replay control reported reduced motion and was disabled.
   - Specimen Illustrative UV motion control reported `Motion reduced` and was disabled.
   - Evidence: `browser/reduced-motion.png`.
7. **390×844 mobile layouts** — PASS.
   - Home: `scrollWidth = 390`, header Donate visible; atlas, study counter, and specimen sections were all locatable and scrollable.
   - Donate: `scrollWidth = 390`.
   - Map background failure: `scrollWidth = 390`, utility list/error remained usable.
   - Evidence: `browser/mobile-home.png`, `browser/mobile-donate.png`, `browser/mobile-map-background-error.png`.

### Browser limitation / environment note

- Direct local `GET http://localhost:3020/api/stats` returned HTTP 500 during QA, and prime independently reproduced the same response. No DB/API source work was undertaken. The final desktop baseline therefore routes only that read to the existing deterministic `statsFixture`; review/count prominence and related UI behavior are fixture-validated rather than evidence of live local stats availability.
- `browser/failure-desktop-live-baseline.png` and `browser/failure-reduced-motion.png` are retained as diagnostic artifacts from the first process. Both affected contexts passed in the explicitly authorized targeted retry and the merged `results.json` supersedes those initial failures.

### Artifacts / raw result

- Raw machine result: `docs/qa/phase-f/polish/browser/results.json` — `success: true`, **7 / 7 PASS**.
- Harness/checklist: `docs/qa/phase-f/polish/browser/phase-f-polish-browser.cjs`, `docs/qa/phase-f/polish/browser/CHECKLIST.md`.
- The harness supports comma-separated `QA_ONLY` selection plus `QA_MERGE=1`; the targeted retry replaced only the two prior failed entries and preserved the five green results.
- `node --check` passes on the corrected harness; `git diff --check` passes for the browser evidence/docs.
- No hero/player/artwork-field source, API/data-policy source, DB state, git history, or deployment was changed by this browser pass.
