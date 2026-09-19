# Phase F editorial/product browser checklist

Status: **complete — merged browser result is 7/7 PASS.** Prime confirmed worker-5 `browserClosed=true` before worker-4 began. The initial full polish process and the later explicitly authorized two-context retry process both completed and closed; they were never concurrent. See `results.json` and the polish handoff for exact evidence.

The browser pass deliberately bypasses the first-visit microscope intro with the existing `sessionStorage['ripple-entered'] = '1'` flag. Hero/player behavior is out of worker-4 scope and is not asserted here.

## Preconditions

- Use the current local / PR #3 tree on `agent/specimen-data-polish`, not production.
- Reuse the coordinator's running local server when available. Default harness target is `http://localhost:3020`; override with `QA_BASE_URL`.
- Run only the specifically authorized Chrome process(es) after worker-5 browser shutdown is confirmed; never overlap them with another heavy browser.
- Do not commit, push, seed, migrate, write to the DB, submit forms, or exercise hero/player controls.
- Evidence belongs only in this directory: `docs/qa/phase-f/polish/browser/`.

## Run command after browser-slot authorization

PowerShell:

```powershell
$env:QA_POLISH_BROWSER = '1'
$env:QA_BASE_URL = 'http://localhost:3020'
node docs/qa/phase-f/polish/browser/phase-f-polish-browser.cjs
```

The explicit `QA_POLISH_BROWSER=1` guard prevents accidental browser launch during preparation.

The browser runs used the already-installed Playwright package at:

```text
C:/Users/ayada/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
```

The repo-local default import was absent; the first Node invocation failed at `require('playwright')` **before any browser process launched**. The guarded run then used the path above. After the first full process exposed two harness/environment limitations, prime explicitly authorized one targeted retry process containing only those two contexts.

## Coverage matrix

1. **Live desktop baseline, 1440×900**
   - Intro session-bypassed; homepage remains search-first.
   - Header Donate control visible.
   - No horizontal overflow.
   - Live Samples count and review-state rows (`Verified`, `Provisional`, `Citizen`, `Unreviewed`, `Illustrative`) are visible before the single contextual evidence note.
   - Atlas tab click + ArrowRight keyboard selection works.
   - Atlas `Methodology & sources` navigates to `Integrated data sources`.
   - Water narrative still exposes `≈240,000` and its own `Methodology & sources` action.
   - Whole-bottle specimen view has no canvas/SVG particle overlay; Illustrative UV stays confined to the separate detail canvas and is labeled `Not a scan result`.
   - Owned homepage/atlas/narrative visible text contains no prototype, continuation-proof, Phase-status, or versioned microscope filename leaks.

2. **Assessment failure → true missing, deterministic home fixture**
   - Search `phase-f-qa` produces a utility location independently of the score request.
   - `/api/utilities/scores` forced 503: location card stays visible; `Assessment data could not be loaded` + `Retry assessments` appears; no score/pass state is fabricated.
   - Retry changes the score response to `{ scores: [] }`: card becomes neutral `Unassessed / No data` and shows `Testing & contribution options`.

3. **Independent home feed failures + retry**
   - Force `/api/activity`, `/api/utilities/recent`, `/api/readings/recent` to 503.
   - Verify explicit `Retry activity`, `Retry locations`, and `Retry readings` states rather than empty-state copy.
   - Toggle each fixture healthy and verify the recovered item appears after its Retry action.

4. **Donate failure + retry**
   - Header Donate remains visible and navigates to the donation page.
   - Force HCB organization API failure: total is `Total unavailable`, never `$0`, with `Retry total`.
   - Retry with deterministic valid HCB cents and verify formatted total appears.
   - No horizontal overflow and no owned visible prototype/status leak.

5. **Map background/vector failure**
   - Deterministic map location/comparison fixtures remain loaded.
   - Force `https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json` to fail.
   - Verify `The map background could not load. Available locations remain in the list below.` and `Retry map background`.
   - `All utilities (2)` list remains usable with both utility names.
   - No canvas or snapshot image is substituted inside the map section.

6. **Reduced motion**
   - `prefers-reduced-motion: reduce` context, intro still session-bypassed.
   - Header Donate and atlas-card CSS transitions resolve to zero duration.
   - 240k study counter remains readable; replay control reports `Motion reduced` and is disabled.
   - Specimen Illustrative UV motion control reports `Motion reduced` and is disabled.

7. **Narrow/mobile, 390×844**
   - Home, Donate, and deterministic map-failure views have no horizontal overflow.
   - Header Donate remains visible.
   - Atlas, study counter, specimen whole-bottle/detail separation remain readable.

## Planned evidence files

- `results.json` — per-check assertions, viewport, and extracted UI evidence.
- `desktop-home.png`
- `desktop-counts-review.png`
- `desktop-atlas.png`
- `desktop-study-specimen.png`
- `desktop-assessment-error.png`
- `desktop-unassessed.png`
- `desktop-feed-errors.png`
- `desktop-donate-unavailable.png`
- `desktop-donate-recovered.png`
- `desktop-map-background-error.png`
- `reduced-motion.png`
- `mobile-home.png`
- `mobile-donate.png`
- `mobile-map-background-error.png`
- `failure-<check>.png` only if a check fails.

After the actual run, append the concrete pass/fail results, browser version, server target, evidence filenames, and any limitations to `docs/qa/phase-f/polish/HANDOFF.md`.

## Actual browser outcome

- Browser: Chrome `152.0.7977.83`
- Base: `http://localhost:3020`
- Final merged result: `success: true`, **7 / 7 PASS**.
- First full process: 5 checks passed; desktop baseline was blocked by the local `/api/stats` HTTP 500 and reduced-motion stopped on an exact-text replay selector after its transition assertions passed.
- Prime independently reproduced the local `/api/stats` 500 and authorized one targeted retry process containing only `desktop-live-baseline` and `reduced-motion`.
- Targeted retry: both contexts PASS. The baseline deterministically routes `/api/stats` to `statsFixture`; therefore count/review UI placement is fixture-validated, not evidence that the local backend stats endpoint was healthy. Atlas keyboard/methodology, narrative methodology + 240k counter, specimen whole-bottle/detail separation, home leak sweep, and desktop overflow all passed in that context.
- Reduced-motion retry confirmed header transition `0s`, atlas transition `0s`, readable 240k counter, and specimen motion controls disabled under reduced motion.
- The targeted retry merged into the five original green contexts; it did not rerun them.
