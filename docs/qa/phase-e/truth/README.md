# Phase E strict missing-data presentation audit

Scope: the actual map, utility-detail, comparison, printable report and share-card paths, after the specimen handoff. The user selected strict missing states: unavailable evidence remains unassessed, with no regional estimate or default pass. This work changes presentation only; the provenance rules, read bridge, database/API writes and suppressed whole-system scoring policy are unchanged.

## Reproduced failures and implemented corrections

`baseline-findings.json` records offline synthetic inputs passed through the real `buildContaminantSummary` and pre-fix chart/report exports. The baseline is `bfcbe4e`; `capture-baseline.cjs` can read those pre-fix modules with `git show` without checking out or resetting the workspace.

1. **Missing and citizen observations became chart “ok.”** The previous chart replaced `latestLevel: null` with zero and chose an “ok” color whenever two exceedance booleans were false. A canonical citizen summary with `unreviewed` benchmark status still became an assessed-looking ratio. The replacement renders independent health/legal comparison cells with explicit neutral missing, unreviewed, illustrative and unit-mismatch states. No raw concentration is substituted for missing data.
2. **The chart mixed raw units and drew an unrelated reference line.** A 0.001 ppm fixture was divided by a 5 ppb benchmark as 0.0002 instead of the canonical normalized ratio 0.2. Raw levels were plotted against a fixed line at 1 labeled “Health guideline.” Comparisons now use the existing canonical provenance and unit rules, with separate normalized ratios. A real zero is retained; negative, non-finite or missing levels cannot establish a comparison.
3. **Partial coverage produced a green share aggregate.** With one reviewed below-benchmark record and one unassessed contaminant, the report emitted `0 above / 1 assessed`, `1 not assessed`, but used an emerald success tone. Aggregate and below-comparison findings now remain neutral. Confirmed reviewed exceedances retain their amber/rose indicators; they are not erased by missing data elsewhere.
4. **Print/detail labels collapsed missing evidence.** Print mapped no-data, missing-benchmark and incompatible-unit records to generic “Unreviewed data,” and a null legal limit displayed “Not regulated.” Print and detail now use the same explicit comparison states. A missing legal benchmark is labeled as unavailable rather than interpreted as a regulatory conclusion. Numeric scores require an explicit `scored` status and a finite 0–100 value; missing, status-suppressed and malformed scores render an unassessed card, including when the score field is absent.
5. **Trend references could imply a reviewed comparison for citizen data.** The caller supplied benchmark lines without checking the active cohort. Trend references now require reviewed, compatible evidence; recorded point units are normalized explicitly, invalid or unreviewed points cannot enter a reviewed series, and unavailable points stay gaps. `connectNulls` is disabled. Unreviewed history is labeled as observations, not a safety trend.
6. **The D3 demonstration used safety wording for fictional values.** It called a modeled area “Safe Scientific Baseline,” labeled nodes “Safe,” described a hovered example as a “real measurement,” and called a null model limit “0 Federal Legal Limit.” Those labels are removed. The diagram says it is not a water assessment, treats the absent model benchmark as unavailable, and uses example-only comparison language. Its unsupported hazard/filter advice is no longer displayed. No new scientific or regulatory figures were added.

## Shared rule and affected files

- New `src/lib/assessment-presentation.ts` applies existing `sampleBenchmarkStatus`/unit-normalization rules to original summary fields. It does not trust cached “exceeds” booleans or ratios over incompatible, missing or citizen evidence. It supplies the shared summary label, independent comparison values/counts and score-presence guard.
- `src/components/charts/contaminant-bar-chart.tsx` now presents an accessible comparison table instead of a misleading mixed-unit plot. Its neutral cells make missing evidence readable rather than hiding it in a chart tooltip.
- `src/components/charts/contaminant-trend-chart.tsx` validates point units/values/review eligibility, preserves null gaps and gates benchmark references.
- `src/components/sections/utility-detail-dialog.tsx` uses those same states for visible summaries, contaminant cards, trend inputs, score display and print output. Existing modal focus/cleanup behavior is preserved.
- `src/lib/water-report-card.ts` uses the shared states for Canvas/share text and neutral incomplete/below-comparison tones. The existing share modal consumes this helper unchanged.
- `src/components/d3/contaminant-spectrum-chart.tsx` changes demonstration labels and default success styling, not data values. Its former misleading title selector is replaced by `data-testid="benchmark-model-baseline"`.

The existing `map-section.tsx`, `sample-read-model.ts`, stats/detail read routes and quality badges were inspected. Map locations load independently from assessments, with explicit request errors/retry and neutral unavailable markers. Canonical stats comparison counts use eligible reviewed samples, not citizen defaults; the fallback read bridge preserves missing verification as unknown/unreviewed. These paths were left unchanged and exercised through their existing fixture contracts. A provenance/source badge identifies the record source or review status, not a water-safety verdict.

## Validation

- `check-truth.cjs`: **12/12 passing**, last complete run `2026-09-19T09:43:28.648Z`. Tests invoke real presentation helpers, actual React comparison/detail/score components through server rendering, the existing aggregator, and trend builders. They cover missing values, citizen/stale flags, unknown PFAS benchmarks, incompatible units, normalization, real zero versus invalid values, partial coverage, retained reviewed exceedances, suppressed scores and null trend gaps.
- `run-contracts.cjs`: **4/4 suites passing**: existing legacy-schema read contracts, provenance regression, public read-path safety, and unit/report regression. Their tests and write-detection assertions were retained. Results and logs are written here, including `verification.json`, without overwriting Phase D evidence.
- Scoped TypeScript: **0 diagnostics**, recorded in `typecheck-results.json`.
- Scoped ESLint and `git diff --check` passed. Git emitted only its normal line-ending notices.

One old read-path fixture needed an input correction. Its “true verified exceedance” case inherited a value of 5 ppb against a 15 ppb legal benchmark, then changed only flags to claim an exceedance. Its latest/average/maximum were corrected to 20 ppb so its existing assertions test a real above-benchmark input. No assertion or write-detection guard was removed. The new adversarial test separately verifies that stale above-benchmark flags cannot override a below-benchmark or citizen record.

```powershell
node docs/qa/phase-e/truth/check-truth.cjs
node docs/qa/phase-e/truth/run-contracts.cjs
node docs/qa/phase-e/truth/typecheck.cjs

node node_modules/eslint/bin/eslint.js src/lib/assessment-presentation.ts src/lib/water-report-card.ts src/components/sections/utility-detail-dialog.tsx src/components/charts/contaminant-bar-chart.tsx src/components/charts/contaminant-trend-chart.tsx src/components/d3/contaminant-spectrum-chart.tsx docs/qa/phase-e/truth/check-truth.cjs docs/qa/phase-e/truth/review-browser.cjs docs/qa/phase-e/truth/run-contracts.cjs docs/qa/phase-e/truth/typecheck.cjs docs/qa/phase-e/truth/capture-baseline.cjs
```

## Browser scope and release limits

`review-browser.cjs` is prepared for two fixture-only desktop/mobile cases covering actual map→detail, print and Canvas share-card output. It must run only after the prime grants the shared browser slot. Every API request is intercepted; no response comes from production, and it performs no share/send/download action. Its result file is `browser-results.json` when run.

The specimen has its own separate completed nine-case browser proof under `../specimen/`. Do not treat that as truth-path browser proof. Prime owns final integrated browser/build checks and publication. Neither the old public main site nor Phase D preview3 is evidence that these uncommitted Phase E changes have been released.

No database mutation, schema migration, scoring heuristic, regional estimate, fabricated snapshot, commit, push or deployment was performed by this worker.
