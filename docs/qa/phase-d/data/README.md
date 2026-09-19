# Phase D: public sample reads and map recovery

## Confirmed failure

The prime inspected the production Netlify **Next.js Server Handler** logs for
`rippleeffecter` during this run. The September 19, 2026, 01:56:35 local entries
reported `PrismaClientKnownRequestError`, code `P2022`, client version `6.19.3`:

```text
sample.findMany:  meta = { modelName: 'Sample',  column: 'Sample.provenance' }
utility.findMany: meta = { modelName: 'Utility', column: 'Sample.provenance' }
```

Log location: `https://app.netlify.com/projects/rippleeffecter/functions/___netlify-server-handler`.
This identifies the missing column rather than inferring the cause from an HTTP
500. The nested utility read also requested Sample metadata. Only
`Sample.provenance` was confirmed absent by those logs; absence of every other
metadata column has not been independently established.

The worker's local workspace has neither `DATABASE_URL` nor `DIRECT_URL` loaded.
It did not connect to, change, seed, or migrate the production database. No
credential values were printed. An earlier GET-only baseline probe launched
before chat identity recovery had an inaccessible process continuation; its
responses are not claimed as evidence here.

## Read compatibility

`src/lib/sample-read.ts` performs the normal Prisma read with an explicit
projection. It retries once only when a structured `P2022` identifies one of
the seven Sample provenance metadata columns. A qualified `Sample` table name
is required unless Prisma explicitly identifies the `Sample` model. A nested
`Utility` model error is accepted only when its column explicitly names Sample.
Other columns, other tables, message-only errors, connection failures, and
failed retries propagate. Filters/orderings that depend on unavailable metadata
are not silently removed.

The retry selects the old scalar columns and requested relations, preserving
filters, ordering, limits, source, dates, levels, units, and historical quality
labels. Requested metadata is conservatively filled as `UNKNOWN`, `UNREVIEWED`,
and null optional fields. A historical `quality: "verified"` does not establish
verified provenance. No global capability cache delays recognition of a later
schema repair. There are no write delegates, raw SQL, or migration calls.

Object responses expose:

```json
{
  "dataStatus": {
    "status": "degraded",
    "code": "legacy_sample_schema",
    "provenanceAvailable": false
  }
}
```

Normal reads return `available`, a null code, and `provenanceAvailable: true`.
This describes schema availability, not whether every returned row is reviewed.
`X-Ripple-Data-Status`, optional `X-Ripple-Data-Code`, and `Cache-Control: no-store`
are also set. Array sample/export responses retain their original response shape
and communicate the read status through these headers.

## Endpoint and display changes

| Public GET | Change |
| --- | --- |
| `/api/stats?view=map` | Queries only utility identity, population and coordinates. Sample or ancillary-stat failures cannot remove these locations. Reports valid and unmapped counts. |
| `/api/stats` | Shared sample read, source-preserving counts, nullable assessment numerators and comparison denominators, normalized reviewed treated microplastics cohort. |
| `/api/utilities/scores` | Separate utility identities and sample reads; legacy metadata cannot produce a score. Comparisons require explicit compatible benchmark units. |
| `/api/utilities/[id]` | Shared read and existing review/unit cohort selection, with degraded status and preserved historical observations. |
| `/api/samples` | Shared read, unchanged array/privacy behavior, status headers, and validated positive integer limits. |
| `/api/export?table=samples` | Shared read, unchanged source/CSV escaping and public projection, conservative exported review status and headers. |
| `/api/utilities/compare` | Shared read and existing cohort summaries. Keeps units/source/review metadata per utility. Does not declare a winner from incomparable dates, units or coverage. |
| `/api/contaminants/[id]` | Raw source-labelled observations retained; averages/maxima use compatible reviewed concentrations and remain null for absent cohorts. |
| `/api/microplastics/trend` | Reviewed finite concentrations normalized to particles/L, explicit treated/untreated groups and UTC quarters; absent groups are null, actual zero is retained. |
| `/api/readings/recent` | Raw citizen observations retained with review and benchmark status; unknown review is not a below-limit finding. |
| `/api/activity` | Only sample-read/comparison behavior changed. Unreviewed sample activity is neutral, while report/chapter/donation behavior is preserved. |
| `/api/dashboard` | Shared sample reads, correct historical quality categorization, and unit-aware reviewed exceedances. Legacy rows cannot fill verified score buckets. |

`sample-read-model.ts` contains finite coordinate/assessment helpers.
`sample-read-cohort.ts` handles compatible reviewed concentrations, rejects
conversion overflow, and distinguishes absent averages from actual zero.
Existing aggregation/review-cohort utilities remain the source for utility
detail and comparison observations.

The map loads locations and assessments independently. It shows separate
location, assessment, nearby-search, detail, and backdrop errors with retry
controls. Null comparison counts are distinct from counted zero findings.
Unassessed/unavailable markers are gray, never a clean/safe classification.
Keyboard activation opens utility records. Invalid/non-finite coordinates are
excluded; valid points outside the composite US projection remain in the list
and are not passed into a marker that cannot project them. Nearby/detail request
generations prevent earlier responses from overwriting newer requests.

The microplastics charts now tolerate null cohorts, identify raw observations
with their recorded review/source labels, and normalize only compatible units.
The former percentage-removal claim from unrelated treated/untreated samples
was removed. Missing trend averages are gaps, not zero measurements. An observed
change in sample averages is not labelled a national or causal treatment trend.

## Completed verification

`verification.json`: **19/19** injected-client tests invoke the actual route
handlers. They cover modern and legacy projections, the observed nested error
shape, non-schema and retry failures, preserving filters/source/units/quality,
partial benchmarks, private-note removal, CSV escaping, real zero, conversion
overflow, and zero database writes/raw operations. No real database or
credentials are loaded by this suite.

The prior `provenance`, `read-path`, and `remaining` regression suites all passed
unchanged, including their existing write-detection negative control. Strict
whole-project TypeScript and scoped ESLint passed. ESLint initially rejected
synchronous effect state resets; retry state now resets in the initiating
button handlers instead. No lint rule or test assertion was relaxed.

`map-verification.json`: **5/5** local application cases passed in one installed
Chrome browser at `http://localhost:3020`, with all API requests intercepted by
synthetic GET fixtures. Cases cover sample failure with locations retained,
neutral mobile legacy data, failed locations followed by successful retry,
partial-comparison filters, and nearby failure/retry. Detail error retry and
keyboard activation, backdrop failure/list fallback, actual public map-outline
loading in the other cases, finite out-of-projection coordinates, zero page
errors, zero write requests, and no horizontal overflow were checked.

The browser and temporary profile were closed before handing the slot back.
Desktop `location-failure-retry.png` and mobile `mobile-legacy-locations.png`
were visually inspected: the map outline, neutral utility markers, explicit
legacy notice and corresponding utility list are present. All screenshot
locations and utility counts in this directory are test fixtures, not claims
about current production data.

## Reproduction

From the repository with installed tools:

```powershell
node docs/qa/phase-d/data/check.cjs
node scripts/qa/run-regression.cjs provenance
node scripts/qa/run-regression.cjs read-path
node scripts/qa/run-regression.cjs remaining
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false

$env:PLAYWRIGHT_MODULE = 'C:/Users/ayada/AppData/Local/Temp/ripple-browser-qa/node_modules/playwright'
$env:PLAYWRIGHT_BROWSER_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node docs/qa/phase-d/data/map-browser.cjs
```

`map-browser.cjs` requires the local app already running and the shared browser
slot free. It does not launch/restart the app or permit a non-loopback target.
Scoped lint covers all changed sample-read/API/map/microplastics TypeScript files
and both QA scripts; see `checks.json` for exact final commands.

## Release limits

This is a read bridge for the confirmed deployed schema mismatch, not a database
migration or a verification of the historical records. Degraded data must remain
labelled until schema/provenance work is separately authorized and completed.
The prime owns preview deployment and actual preview GET verification. Local
fixture success alone does not establish that the production map is restored.

No write endpoint was changed or exercised. In particular, new-metadata writes
may still require the missing database migration; this work does not establish
submission/admin-write compatibility. Public count-only routes such as
`utilities/recent` and `leaderboard` already use explicit old-column/count
projections; they were inspected, not redesigned. Admin-only pending/export
readings and broad content/scientific claims are outside this read-recovery QA.
The comparison and utility-detail responses expose review/source status; the
prime owns any additional global degraded-state banners in surrounding pages.
