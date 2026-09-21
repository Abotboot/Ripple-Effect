# Official EPA monitoring replacement

Source: [EPA UCMR occurrence data](https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule), final August 2026 release, retrieved September 20, 2026.

The pinned ZIP SHA-256 is `ff8a6bf937823cdd75295d02f662966e8473eececb47190c406b9de53b2b6389`.
`src/data/epa-ucmr5.json` contains 1,052 original analytical results for PFOA and PFOS across 29 directory utilities. It retains the source unit, sample date, method, facility, sampling point, sample ID, reporting limit, result qualifier and original system name/ID.

991 results are below the reporting limit. They remain null-valued, qualified results, displayed as `<4 ppt`. Of 61 quantified results, 59 exceed 4 ppt and two equal it. Eight utilities have at least one result above the benchmark; 21 have none above it in this subset. These are historical sample comparisons, not current water-safety ratings or regulatory violations. No running annual average is invented.

The 4 ppt PFOA and PFOS MCLs come from [EPA's PFAS regulation page](https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas). EPA's [July 2026 data definitions](https://www.epa.gov/system/files/documents/2023-08/ucmr5-data-summary_0.pdf), pages 2 and 17, explicitly distinguish UCMR results from compliance determinations and define `<` / blank analytical values.

## Identity and scope

The old seed directory contains incorrect PWSIDs, including Newark pointing at Short Hills and Los Angeles pointing at Baldwin Hills. The snapshot includes an explicit reviewed crosswalk to EPA's system names and IDs. Matching requires the original directory name, state and a listed ID, never the city alone or an old ID alone. Public directory reads expose the corrected primary PWSID; source results retain every original EPA PWSID. Corrected-ID searches resolve to the existing utility record.

New Orleans includes its Carrollton and Algiers systems, both identified separately in the report. Houston and Miami results cover the named main systems only. Pins remain utility locations, not neighborhood-specific sampling sites or service boundaries.

MWRA (Boston) is not replaced by a nearby Boston distribution utility: the EPA snapshot has no matching MWRA system record. Its existing state remains unassessed. MWRA publishes separate [utility monitoring information](https://www.mwra.com/your-water-system/drinking-water-quality/ucmr-unregulated-contaminant-monitoring-rule-data); broad qualitative statements are not converted into invented individual sample records. This release does not claim to assess microplastics, lead, or every contaminant.

## Read-only integration

The checked-in snapshot is served with utility details and used consistently for map colors, search-result comparisons, source-result downloads, printable reports and share cards. Legacy data stays under “Other historical records” and keeps its provenance gates. No existing sample is upgraded, rewritten or deleted. No database migration, seed or import runs.

The JSON download is `/api/utilities/{id}?view=official`. PFOA/PFOS sample comparison counts are kept separate from database-wide counts and health-guideline comparisons. A two-compound subset does not produce an overall safety score.

## Reproduction and checks

Run `python scripts/data/build-epa-snapshot.py /path/to/ucmr5-occurrence-data.zip`. The builder validates the archive hash, reviewed system names, units, qualifiers, duplicate keys, and preserves all selected rows. It uses Python's standard library and never connects to a database.

Focused checks:

- `npx tsx scripts/qa/official-monitoring-regression.ts`: all records, identity mismatch rejection, non-detects, exact-limit handling, unit mismatch, missing/invalid values and report-card presentation.
- `npx tsx scripts/qa/official-monitoring-api.cjs`: actual route handlers with an instrumented legacy-schema database stub, corrected-ID search, identical detail/download results, zero writes.
- `npx tsx scripts/qa/read-path-safety.cjs`: existing read-path and false-safety gates.
- `npx tsx scripts/qa/official-monitoring-browser.cjs`: desktop Chromium and mobile WebKit, source-table scrolling, nested share dialog/close, search and map states.
- Production build and TypeScript.
