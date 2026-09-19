# Verified PR #3 preview

**Application revision:** `464ca6007af6ff4a2174dabda37a0d0612070b66`

**Preview:** https://deploy-preview-3--rippleeffecter.netlify.app/

**Completed:** 2026-09-19T07:56:44.146Z

**Browser:** installed Chrome 152.0.7977.83, desktop and mobile emulation.

Netlify's GitHub status was successful for that exact application revision
before the check. This evidence is committed separately and does not alter the
application. Main remains the preceding release; PR #3 is the review branch.

## Actual public data, not mocked responses

All **16 public GET checks returned HTTP 200**. They cover map locations,
full stats, scores, samples, both public exports, two utility details, comparison,
contaminants, microplastics detail/trend, recent readings, activity, dashboard,
and nearby search. Related calls are grouped where one category uses two URLs.

- All **30 utility IDs** agreed between the utility export, map endpoint,
  full stats and scores response. All 30 had valid mapped coordinates.
- All **3,073 sample IDs** agreed between the sample API and export. For each
  ID, the value, unit, collection date, original source label, quality label,
  treatment status and utility/contaminant IDs matched exactly.
- Stats/dashboard counts agreed with those full record sets; two utility-detail
  sample counts and the microplastics-detail sample count were reconciled too.
- Legacy metadata is explicitly degraded. No historical `quality: verified`
  string becomes a reviewed measurement. Scores and reviewed-only averages
  remain null. The displayed quality groups are **651 citizen-labeled** and
  **2,422 unreviewed** observations, not 3,073 newly authenticated measurements.
- Nearby results use actual utility IDs and sorted finite distances within the
  requested radius. Cross-utility comparisons do not invent a winner.

This establishes consistency of the application's fetched records, **not an
independent scientific audit of the source measurements**. No API writes or
database migrations were performed. Metadata-dependent writes still need the
separately managed schema rollout described in the data report.

## Published browser interaction

Both **1440×1000** and **390×844** cases passed with actual public GET responses,
not synthetic fixtures. Each case verified:

- 30 visible map markers and the matching utility list; keyboard opening of a
  real utility detail; neutral unassessed comparisons; Escape closing.
- Kenny in Finance and no Aryash entry. Missing headshot requests are gone;
  initials are displayed rather than fabricated/reassigned portraits.
- The new five-second microscope delivery and transition into the existing live
  artwork, followed by the continuous specimen UV scan and real rotation.
- The study count reaches approximately 240,000 and opens the explanatory
  breakdown. No injected Netlify Drawer or horizontal overflow was present.

Final results contain **zero write attempts, zero page errors, zero console
errors and zero failed HTTP responses** in both browser cases. The images were
visually reviewed after entrance animation settled.

## Evidence

Machine-readable: [preview/results.json](preview/results.json).

| Area | Desktop | Mobile |
| --- | --- | --- |
| Restored real-data map | [Map](preview/1440-live-map.png) | [Map](preview/390-live-map.png) |
| Neutral utility details | [Details](preview/1440-live-utility-detail.png) | [Details](preview/390-live-utility-detail.png) |
| New microscope | [Camera study](preview/1440-new-microscope.png) | [Camera study](preview/390-new-microscope.png) |
| Continuous UV view | [Specimen](preview/1440-new-uv.png) | [Specimen](preview/390-new-uv.png) |
| Research counter | [Count](preview/1440-study-count.png) | [Count](preview/390-study-count.png) |
| Finance name | [Kenny](preview/1440-kenny-finance.png) | [Kenny](preview/390-kenny-finance.png) |

The `*-failure.png` captures are retained from the **first** published pass,
which exposed the older dialog semantics/zero-exceedance problem. They are not
final acceptance images. Later checking found nine absent team-image assets;
those requests were removed, and the final strict console-error check passes.

## Other regression checks

The latest code passed all **9 fixture/type/lint/media/build gates**, including
the unchanged earlier provenance, unit and public-read zero-write suites.
Additional focused evidence covers 19 handler fixtures, 5 map browser cases,
3 counter cases, 9 specimen cases plus 2 final legibility captures, 19 shared
hero/integration cases, and 2 utility-modal keyboard/neutral-state cases.
These are bounded tests, not a claim that all existing repository lint or every
possible browser/device behavior is clean.

Reproduce the deployed check using installed Playwright/Chrome:

```text
QA_EXPECTED_COMMIT=464ca6007af6ff4a2174dabda37a0d0612070b66
node scripts/qa/phase-d-preview.cjs
```

Set that environment variable using the local shell syntax. It records the
separately verified deployed revision; it does not force or deploy that revision.
