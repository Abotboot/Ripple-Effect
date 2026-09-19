# Phase F citizen-reading moderation and eligibility review

Scope: read-only source/contract review of the existing citizen submission -> admin moderation -> public presentation/scoring path. No database connection, write, seed, migration, moderation action, or production request was performed.

## What is actually implemented

1. **Public submission creates an explicitly citizen reading.**
   - `POST /api/readings` is public, validates/rate-limits the input, and creates a `Sample` with `source: 'Citizen Test'` and `quality: 'citizen'`.
   - The route does **not** assign `REGULATORY_REPORTED` / `LAB_REPORTED` provenance or `VERIFIED` verification metadata.
   - Therefore a fresh citizen submission is not eligible for a municipal safety comparison.

2. **There is an authenticated admin queue and moderation control.**
   - `GET /api/readings/pending` requires admin auth and groups records by the legacy `quality` field: citizen = pending; provisional/verified = “approved”.
   - The admin UI exposes Provisional, Verify, and Delete actions.
   - `PATCH /api/readings/[id]` requires admin auth, but it updates **only the legacy `quality` string**.

3. **The current “Verify” button is not a complete reviewed-eligibility transition.**
   - Shared policy `isEligibleForScoring()` requires both:
     - `verificationStatus === 'VERIFIED'`, **and**
     - provenance of `REGULATORY_REPORTED` or `LAB_REPORTED`.
   - Changing a citizen row from `quality: 'citizen'` to `quality: 'verified'` does not set either requirement.
   - `source: 'Citizen Test'` also normalizes conservatively to citizen provenance when explicit provenance is absent.
   - Result: the admin UI can move a row out of the legacy pending tab, but that alone does **not** make the reading eligible for safety scoring/comparison.

4. **Citizen/unreviewed records are gated out of safety comparisons in the reviewed paths.**
   - `aggregate.ts`, `sample-read-cohort.ts`, stats, dashboard, utility scores, contaminant detail, and the Phase E presentation helpers all use the shared eligibility gate rather than the legacy quality label.
   - Existing Phase E truth tests specifically prove that stale “verified” flags/ratios cannot make a citizen record a reviewed verdict.

5. **Public recent-citizen feed is deliberately separate.**
   - `GET /api/readings/recent` reads only `quality: 'citizen'` records and computes benchmark status through the shared provenance-aware helper.
   - It returns source/review labels, and citizen rows remain unreviewed/not assessed.
   - A row promoted to legacy provisional/verified quality will no longer appear in this citizen-only recent feed, but that does not imply it has become scoring-eligible.

6. **Phase F closed a separate notification-policy bypass.**
   - Before this fix, the public citizen POST compared the raw submitted number directly with contaminant benchmark numbers and could call the Discord threshold-alert webhook before provenance review or unit compatibility was established.
   - That bypass was independent of the site's protected scoring/UI paths and could therefore emit language such as “EXCEEDS EPA LEGAL LIMIT” for an unreviewed or unit-incompatible citizen value.
   - The public citizen route now dispatches only the existing unreviewed queue/receipt notification. It no longer imports or invokes the threshold-alert webhook.
   - The queue notification itself now says explicitly that the reading is unreviewed and is **not** a safety assessment or threshold alert.
   - Missing alert benchmarks are labeled “Benchmark unavailable”, not “Unregulated”.
   - A fixture-only regression invokes the **actual `POST /api/readings` handler** with its database, rate-limit, and webhook dependencies mocked. An extreme citizen value with an incompatible unit still creates only a mocked `quality: 'citizen'` row, assigns no institutional provenance/verification metadata, emits one mocked unreviewed queue notification, and emits **zero** threshold alerts. It performs no real database write and no network webhook.

## Truthful product conclusion

The project has a real authenticated moderation queue, and citizen/unreviewed observations are correctly prevented from entering reviewed safety comparisons by the shared provenance gate. However, the current admin “Verify” action is **legacy workflow labeling, not a complete provenance-verification promotion**. Admin presence alone is therefore insufficient evidence that a citizen submission can become a reviewed regulatory/laboratory record.

The UI/product copy must not say that an admin-approved citizen reading becomes a verified safety measurement unless a future reviewed workflow also records the required provenance, verification status, source/method evidence, and review timestamp.

## Release guidance for this Phase F pass

- Keep citizen readings visibly separate from reviewed institutional evidence.
- Keep missing/unreviewed states neutral: **Unassessed / No data**, no score, no default “within guidelines”.
- Do not turn the existing quality-only admin action into a safety claim.
- No API/data-policy mutation is part of this editorial Phase F scope.
- If a future implementation adds a true promotion workflow, it needs an explicit, auditable transition that sets reviewed provenance/verification metadata and should be covered by zero-write fixtures before any live DB action.

## Read-only validation performed

- Inspected:
  - `src/app/api/readings/route.ts`
  - `src/app/api/readings/[id]/route.ts`
  - `src/app/api/readings/pending/route.ts`
  - `src/app/api/readings/recent/route.ts`
  - `src/components/sections/admin-section.tsx`
  - `src/lib/provenance.ts`
  - `src/lib/aggregate.ts`
  - `src/lib/sample-read-cohort.ts`
- Re-ran Phase E truth fixtures and preserved contract suites earlier in this Phase F session:
  - truth presentation: **12/12 passing**
  - legacy/provenance/read-path/unit-report suites: **4/4 passing**
  - scoped truth TypeScript: **0 diagnostics**
- Focused notification-policy regression:
  - `node scripts/qa/run-regression.cjs citizen-alert`
  - actual POST handler, malicious high/incompatible-unit citizen fixture: **1 mocked queue notification, 0 mocked threshold alerts**
  - mocked `sample.create` remains `quality: citizen` with no `provenance`, `verificationStatus`, or `verifiedAt` promotion
  - no real database write, rate-limit mutation, or live webhook/network submission
- No database write or admin action was executed.
