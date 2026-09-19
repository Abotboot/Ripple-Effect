# Phase F coordinator handoff

Status: **final pre-commit handoff; implementation, browser QA, source gates, and production build all pass. Release staging/PR preview verification remain.**

Reference is the updated local / PR #3 branch, not unmerged production. Do not claim production is fixed until merge and production deploy verification.

## Identity / baseline
- Coordinator run: `93a0bc70-a42f-4940-b7bd-38a6e84efa0f`.
- `worker-3` specimen: GPT-5.6 xhigh, completed.
- `worker-4` editorial/product: GPT-5.6 xhigh, source pass + final merged browser QA complete.
- `worker-5` media integration/QA: GPT-5.6 xhigh, authoritative intro UX + browser QA complete.
- `worker-6` stood down before browser use to prevent parallel Playwright sessions.
- Branch `agent/specimen-data-polish`; Phase F started from `bfcbe4e601ddb75c9b2c2980c9fca5a8a9176545`.
- Source is frozen at this checkpoint except for a real release-blocking failure discovered during narrow staging or exact-SHA preview review.
- Preserve all dirty Phase E work. Never stage `AGENTS.md`, `CLAUDE.md`, credentials, local receipts/caches/scratch.
- No DB mutation, migration, seed, new media generation, or purchase in this coordinator phase.

## Microscope — integrated
User approved the second WAN take, then requested the final abrupt endpoint snap be removed. Authoritative source:
`C:/Users/ayada/Downloads/wan-3-video-53cbd3dc-82bb-4832-9a0b-65a6c50fcc61.mp4`
SHA-256 `1874274321D1A9B9A596AF65563166468B769A2420C2D8E79CEC1B99934ED47C`.

Frame inspection found source frame 89 at 2.966667s is the first bad snap; frame 88 at 2.933333s is the last clean frame.

Authoritative delivery:
- `public/media/ripple/microscope/microscope-journey-v4.mp4`
- SHA-256 `28031DA7910E070684F0423B9794E6E50CB31D5CB0465A66BE880F6913A32AF8`
- 1280x720, H.264 High/yuv420p, 30fps, 89 frames, 2.966016s.
- No deterministic approach prepended; no fade/dissolve/black endpoint/padding/interpolation/speed change.
- `opening-v4.png` exactly matches decoded frame 0.
- `terminal-v4.png` is the controlled Chrome/sRGB representation of canonical frame 88 and is not black. The FFmpeg-to-Chrome conversion delta is bounded/documented; no cross-browser byte-exact claim is made.
- `src/lib/artwork-journey.ts` uses the v4 assets/native duration.

Rejected fused-eyepiece WAN take remains disqualified. Deterministic single-lens crop is unused evidence only.
Evidence: `docs/qa/phase-f/microscope/HANDOFF.md`, `approved-delivery.json`, tail-discontinuity evidence, `scripts/qa/phase-f-microscope-delivery.cjs`.

### Authoritative visitor intro

- Fresh first visit is a full-viewport exact `opening-v4.png` cover with real HTML title/copy, Enter, and a discreet cover-only Skip.
- No video element/request occurs before Enter. Enter starts v4 at normal rate; the visitor video has no timeline/timecode/stage label, Pause/Restart rail, or playback Skip overlay.
- Cover/video/terminal/entering share one viewport rectangle with `contain` framing. 1440×900, 390×844, and 320×568 all pass, including portrait eyepiece-path containment.
- Site header, floating Search trigger, and Scroll-to-top are suppressed only during cinematic cover/video/entering; Skip remains topmost/hit-testable and chrome restores on exit.
- Cover Skip and Escape on cover/video/entering pass. Completed/skipped sessions expose **Replay intro** and same-session reload bypasses the cover/video request. Reduced motion bypasses cinematic motion.
- Artwork RAF is paused behind the cover and resumes live. Search input remains mounted/preserved; all five artwork requests and Highlight-a-form still pass.
- Failed/invalid decode and rejected `play()` both recover through **Retry intro**. Offscreen suspension and detached-source/scroll/inert cleanup pass.
- Natural end and natural Replay keep the terminal frame mounted until React detaches the video. Instrumentation records zero post-ended destructive resets on a connected video; decoder reset occurs only detached. Frame-by-frame recording scans around both handoffs at all three viewport sizes report zero opening/frame0-like frames.
- Final headless QA does not force a synthetic/native `document.hidden` transition to avoid visible Chrome churn; the unchanged visibility gate/listener is retained and the limitation is documented in the microscope handoff.

## Specimen — integrated
- Realistic retail-PET photo remains the full-vessel view.
- No fake 3D rotation and no particles/fibers on the whole bottle.
- Separate detail/UV illustration only.
- Phase F reduces UV forms to 12, shrinks/slows them, caps draw cadence, and adds real `Retry detail` recovery.
- Copy explicitly says image enlargement is not calibrated microscopy and illustrated forms are not measured/not to scale.
- Desktop browser regression passed pointer/keyboard crop controls, 12 UV forms, forced Canvas failure/retry, reduced/offscreen/hidden suspension, no overflow, and HTTP 200 specimen asset load.
- Fresh exact 390px Phase F connector proof was not obtained; this limitation is documented instead of overstated.
Evidence: `docs/qa/phase-f/specimen/HANDOFF.md`.

## Quality Watch editorial/data-density pass
The updated local/PR3 UI now follows the requested rules.

**Option A strict missing**
- No reviewed measurement => neutral `Unassessed / No data`.
- No score, regional estimate, or default regulatory pass.
- Missing-state utility cards expose `Testing & contribution options`.
- Health summary numbers render only when reviewed comparable evidence exists.

**Option B explicit error + retry**
- Assessment fetch errors are separate from true missing data.
- Independently fetched utility locations remain available if comparison reads fail.
- Activity, recent utilities, citizen readings, donation totals and map background expose explicit retry actions.
- Map background/vector failure keeps the usable location list; no fake snapshot is substituted.

Editorial changes also preserve search-first flow, the five image placements, atlas keyboard behavior, education anchors, 240,000 study counter, master Highlight-a-form interaction and accessibility. Repeated generic caveats were consolidated into contextual notes plus shared `Methodology & sources` actions. Active scoped product copy no longer leaks prototype/proof/versioned-media status strings. Donate stays visible; funding failure is `Total unavailable` + Retry, never fake `$0`.
Evidence: `docs/qa/phase-f/polish/HANDOFF.md`.

### Final editorial/product browser result

- `docs/qa/phase-f/polish/browser/results.json` reports `success: true`, **7/7 PASS** against the current local tree with the intro session-bypassed through `sessionStorage['ripple-entered'] = '1'`.
- Desktop 1440×900 passed the search-first baseline, review/source-count prominence, atlas click + ArrowRight keyboard behavior, methodology navigation, 240,000 research counter, specimen whole-bottle/detail separation, owned-copy leak sweep, and zero horizontal overflow.
- Assessment error → retry → true missing passed without losing independently fetched utility locations; true missing remained `Unassessed / No data` with `Testing & contribution options`.
- Activity, recent-utility and citizen-reading error/retry states all recovered from deterministic fixtures.
- Donation failure rendered `Total unavailable` + `Retry total`, never fake `$0`, and recovered to the deterministic total; header Donate remained visible.
- Map background/vector failure kept the utility list usable, exposed retry, showed no fake canvas/snapshot substitute, and remained overflow-safe.
- Reduced-motion passed at 390×844 with zero-duration touched transitions, readable study counter, and disabled/reduced specimen motion controls.
- 390×844 home/donate/map layouts all reported `scrollWidth = 390`; header Donate and key educational/specimen sections remained available.
- **Known local limitation:** direct `GET http://localhost:3020/api/stats` returned HTTP 500 during QA, independently reproduced by prime. No API/DB source change was made. The final desktop baseline routed only `/api/stats` to the existing deterministic `statsFixture`, so count/review placement is fixture-validated rather than evidence that the local stats endpoint was healthy.

## Citizen moderation / notification truth
Read-only review confirms public citizen POST creates `source: Citizen Test`, `quality: citizen`, and does not set institutional provenance, `verificationStatus: VERIFIED`, or `verifiedAt`. Admin moderation is authenticated, but its current `Verify` action changes only legacy `quality`; it does not establish `REGULATORY_REPORTED`/`LAB_REPORTED` provenance or the shared VERIFIED metadata required by `isEligibleForScoring()`. Admin presence alone therefore does not promote citizen data into institutional safety scoring.

A real bypass was fixed: public citizen POST previously compared raw unreviewed values directly with benchmark numbers and could call the Discord threshold-alert webhook without provenance review or compatible units.

Now:
- citizen POST sends only the unreviewed queue/receipt webhook;
- citizen receipt explicitly says it is unreviewed and not a safety assessment/threshold alert;
- citizen POST no longer imports/invokes `sendDiscordAlertWebhook`;
- missing alert benchmarks render `Benchmark unavailable`, not `Unregulated`.

Focused regression invokes the **actual POST handler** with DB, rate-limit and webhook dependencies mocked. An extreme incompatible-unit citizen value yields one mocked queue notification, zero mocked threshold alerts, remains `quality: citizen`, and receives no `provenance`, `verificationStatus`, or `verifiedAt`. No real DB write or webhook/network call occurs.
Evidence: `docs/qa/phase-f/MODERATION_TRUTH_REVIEW.md`, `scripts/qa/citizen-notification-safety.cjs`.

## Integrated verification already passed
- full TypeScript `tsc --noEmit --incremental false`: **PASS**;
- Phase E strict truth presentation: **12/12 PASS**;
- preserved contract runner: **4/4 PASS** (legacy/provenance/read-path/unit-report suites);
- scoped truth TypeScript: **0 diagnostics**;
- actual citizen `POST /api/readings` alert regression: **PASS** — one mocked unreviewed queue notification, zero mocked threshold alerts, no provenance/verification promotion and no real DB/webhook call;
- Phase F microscope delivery/poster verifier: **PASS**;
- preserved five-artwork integrity test: **2/2 PASS**;
- scoped ESLint across the final changed/untracked code set: **40 files PASS**;
- `git diff --check`: **PASS**;
- Next.js production build: **PASS**.

The local development server was intentionally stopped before the final production build so the build did not run against an active dev server. No browser QA or source mutation was performed during that build gate.

## Browser status
- Specimen Phase F desktop regression complete.
- Microscope authoritative intro browser QA complete. `docs/qa/phase-f/microscope/browser/results.json` reports **11/11 passing checks**, `passed: true` / `browserClosed: true` for 1440×900, 390×844, 320×568 and the bounded lifecycle cases. Fresh recordings and first/Replay no-flash frame analyses are saved in the same folder.
- The microscope no-flash regression is authoritative: first entry and natural Replay retain the terminal frame while the video is mounted; instrumentation records zero destructive `load()` / source-removal operations with `afterEnded && isConnected`, and decoder/source teardown occurs only after detachment. Recording scans at all three viewport sizes found zero opening/frame-0-like frames in the ended→entering handoff window.
- Editorial/home/donate/atlas/narrative browser QA is complete with the final merged **7/7 PASS** result. The only environment limitation is the independently reproduced local `/api/stats` HTTP 500 described above; its desktop baseline assertion uses the existing deterministic fixture for that single read.
- All owned browser processes were closed by their harnesses before the final source/build gate sequence.

No browser blocker should be hidden. Concrete failure details must be recorded before release.

## GitHub/release gate
The release gate remains:

1. Narrow-stage only the intended Phase E/F source, approved runtime media and selected current evidence per `docs/qa/phase-f/RELEASE_STAGING_REVIEW.md`. Do not stage `AGENTS.md`, `CLAUDE.md`, credentials, local receipts/caches/scratch, generated build output, rejected/obsolete evidence, or broad historical QA trees that the staging review excludes.
2. Commit and push the staged release to PR #3.
3. Record the exact full commit SHA and Netlify preview/status below.
4. Verify the PR #3 preview.
5. Stop for Codex final review.
6. **DO NOT MERGE YET; wait for Codex exact-SHA preview review.**

After exact-SHA preview review approval, merge commit message into main must be EXACTLY `I've become the founder thanks to SiddhantJ123` with no additional body or standard merge boilerplate.

- Final commit SHA: **[PENDING — fill after prime commits]**
- Netlify preview URL/status: **[PENDING — fill after PR #3 preview is available]**
