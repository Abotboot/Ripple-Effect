# Street map and measurement audit

Verified 2026-09-20. No production database writes.

## Map

Replaced the state-outline SVG with Leaflet 1.9.4 and OpenStreetMap street tiles.
Zoom spans 2 through 19. City picks open at zoom 13. Radius circles use meters,
and radius searches now include 1, 5, 10 and 25 miles. Utility coordinates remain
utility locations, not neighborhood service boundaries or household readings.
Attribution is visible. Tiles use the provider's normal browser caching; there
is no bulk prefetch, offline download, or tile proxy.

`scripts/qa/street-map-regression.cjs` passed Chrome and WebKit at 1440px and
414px: zoom 4 to 19, requested tile coordinates, a synthetic legal-exceedance
fixture's marker color, modal opening/closing, US overview, attribution and
tile failure/retry. Browser regression tiles and API responses are fixtures.

## Existing production measurements

Read-only `/api/samples?limit=5000` returned 3,073 records:

| Source label | Records |
| --- | ---: |
| Citizen Test | 653 |
| Research Lab | 1,081 |
| EPA UCMR | 669 |
| Utility CCR | 670 |

The response reports `legacy_sample_schema`: verification columns are absent.
No rows expose a source URL or verified provenance. The metadata fallback is
UNKNOWN/UNREVIEWED. All 30 mapped utilities currently have zero eligible samples.
This does not establish that every measurement is false; it prevents claiming
they were individually verified.

The earlier `prisma/seed.ts` at commit `a92c5d8` generates concentrations with
`rng(42)` and assigns `sourceOptions[Math.floor(rand() * sourceOptions.length)]`,
including EPA UCMR and Utility CCR. A source label alone is therefore insufficient.
Current seed code correctly labels its generated data illustrative.

The NIH reference in `water-narrative.tsx` is the January 2024 bottled-water
study, not a municipal utility dataset:
https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water

## Import repair

The administrator import endpoint previously discarded provenance, verification,
source URL, source record ID, reporting period and method. It now retains those
fields. Verified imports require explicit lab/regulatory provenance and a source
URL. Missing units, dates, nonfinite/negative levels and unsafe URLs are rejected.
Source labels and the old `quality=verified` field do not silently upgrade records.

`scripts/qa/sample-import-regression.ts` demonstrates that documented, verified
fixture imports produce above/below benchmark results, and undocumented imports
stay unreviewed. This test makes no database writes.

Existing records need their original source files or utility reports reconciled
before reclassification. The additive schema migration in
`docs/migrations/provenance-baseline-runbook.md` is also still needed; applying
that migration alone would not verify any historical measurement. Neither the
migration nor a retrospective verification/backfill was executed in this change.
