# Phase D — specimen, research interaction and data-read recovery

**Published PR #3 preview verified:** 30 actual mapped utilities, 3,073
reconciled observations, 16 successful public GET checks, and clean desktop/mobile
interaction runs. See [PREVIEW_VERIFICATION.md](PREVIEW_VERIFICATION.md) for
the tested application revision, evidence and historical-data limitations.

This follow-up starts from production/main `be0f622eece788684de60c9e5de17be010363e0f`
on `agent/specimen-data-polish`. The approved hero artwork and category renderer
are preserved. The rejected generated glass-vial/fluorescent images are not used.

## Requested changes

- **Finance:** the About Us Finance entry is Kenny. Aryash's portrait is not
  reassigned to a different person; the existing initials fallback is used.
- **Research interaction:** the approximately 240,000 particles/L study average
  counts up on entry, can be paused/replayed, and has an expandable 90/10 visual
  breakdown. Its accessible text always states the final study value. Motion
  stops offscreen/hidden and reduced motion shows the static result. This is
  published research, never a live sensor or a measurement of the visitor's water.
- **Specimen:** one real Three.js PET-shaped object remains in both views.
  A restrained scan reveals illustrated fibers/fragments; drag and range rotation,
  reset, filters, rescan and pause remain actual controls. Rejected neon images
  and the old wireframe/dense-dot treatment are not used. The renderer has a
  truthful static fallback if WebGL fails; unsupported rotation is disabled.
- **Microscope:** a single Kie.ai/Kling five-second generation uses the user's
  earlier microscope artwork. It replaces the visually rough establishing shot
  with more detailed ivory/metal/rubber surfaces and a closer camera move. The
  generation did not enter the lens completely: the web delivery therefore
  includes an explicit final 0.4667-second editorial dissolve to black, then the
  unchanged live artwork continuation. This is not claimed as a physically
  continuous 3D optical pass-through. See `microscope/delivery.json`.
- **Data/map:** exact missing-column compatibility restores historical reads,
  without pretending legacy records have reviewed provenance. Location loading
  no longer depends on sample/score/finance loading. Unknown map status stays
  neutral rather than green/safe. Service errors have retry actions and remain
  distinct from missing records and missing comparisons.

## Confirmed cause of the production data outage

The existing Netlify production **Next.js Server Handler** log at September 19,
2026, 01:56:35 local time reported Prisma **P2022** for **Sample.provenance**,
both on `sample.findMany` and nested `utility.findMany` reads (client 6.19.3).
The newer application requested columns not yet present in the database.

The new read bridge retries **once**, only after this precise structured
missing-column error, using the old columns. It keeps original values, units,
source labels and dates; absent metadata becomes UNKNOWN/UNREVIEWED/null. Other
failures are not rewritten as successful empty responses. Body/response headers
identify degraded legacy reads. No migration, seed, raw SQL write or database
change is performed. This does not certify old data or repair metadata-dependent
write endpoints; those still require a separately managed schema rollout.

See `data/README.md` for audited routes, tests and release limitations. Home
shows the degraded-state notice, displays unavailable comparisons as a dash,
and includes Unreviewed/Illustrative categories instead of silently omitting them.

## Reference review

The public **EWG Tap Water Database** was inspected in a browser: ZIP search,
state discovery, utility-oriented results and a separate standards explanation
are the useful patterns. Its imagery, code and marketing claims are not copied.

The **Water Quality Portal** exposes location, date, measured-characteristic
and source filters and prominently discloses dataset/version freshness. The
applied lesson is to make data scope and unavailable status visible alongside
the experience, not imply that absence of data means a clean result.

References inspected:
- https://www.ewg.org/tapwater/
- https://www.waterqualitydata.us/
- https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water

The NIH summary supports the 2024 three-brand study average and approximately
90% nanoplastic share. The actual study used stimulated Raman scattering;
the bottle's UV mode remains explicitly an illustration, not that assay.

## Generation and credentials

One five-second Kling v2.5 Turbo image-to-video task used **42 existing Kie
credits**, quoted as $0.21 on its pricing page. No credits were purchased, and
no further generation was submitted. The credential was read only in memory
from the user's specified local file; it is absent from code, build inputs,
client bundles, committed evidence and printed output. Kie is not a runtime
dependency of the site: the reviewed MP4/posters are served locally.

The raw generated candidate is retained for provenance. Delivery normalizes
its 1916×1080/24fps output to 1920×1080/30fps/5 seconds and removes audio. Both
web posters are exact lossless copies of decoded delivery frames. The original
previous microscope clip remains unchanged in `public/media/ripple/live/`.

## Verification records

- `counter/results.json`: count progression, manual pause, replay, offscreen
  suspension, reduced-motion behavior and expandable breakdown.
- `specimen/specimen-results.json`: layouts, real rotation/scan/filter behavior,
  pause and visibility lifecycle, reduced motion and WebGL failures. Final
  legibility-only changes are separately recorded in `legibility-results.json`.
- `data/verification.json`, `data/map-verification.json`: actual GET handlers
  with injected database fixtures and browser map cases. No fake fixture is
  persisted or substituted into a live endpoint.
- `integration/results.json`: the shared hero regression rerun against the new
  microscope delivery, preserving historical Phase C evidence separately.
- `microscope/delivery.json`: exact media identity, processing and pixel checks.

Local fixture success is not proof of production restoration. Final preview
read checks must verify the deployed branch against actual responses before
the data outage is described as resolved. Main is not changed by this branch.

## Published-read follow-up

The first live preview pass returned HTTP 200 for all 14 checked public reads.
It reconciled all **30 utility locations** and **3,073 observations** with the
public exports: IDs, values, units, dates and source labels agreed. Legacy
metadata was clearly degraded; all scores remained unavailable rather than
fabricated. This is consistency of the fetched records, not independent
authentication of the underlying historical measurements.

That same browser pass exposed an older utility-detail panel issue: the panel
lacked dialog semantics/Escape behavior and showed green zero-exceedance tiles
even when no comparison was assessed. The follow-up adds named modal semantics,
keyboard focus containment/return, Escape, 44px actions and a legible title.
Unavailable comparisons now read **Not assessed**, and an unavailable score no
longer displays a 0–100 gauge or a faux deduction breakdown. The printable
summary likewise distinguishes unassessed comparisons and prints benchmark units.
Two local UI cases using the actual read-only preview records pass at desktop
and mobile sizes (`detail/results.json`); the nine build/fixture gates pass again.

The About Us review also found nine hardcoded headshot URLs with no matching
assets in `public/team`; those requests are removed and the existing initials
avatars are used. No portrait is invented or reassigned. The About copy no longer
claims the entire live dataset is on GitHub or that the records are calibrated to
agencies. The map's positive microplastic filter is explicitly labeled **Reviewed
microplastics detected** so its zero does not imply absence from unreviewed records.
