# Release staging review

Read-only audit of branch `agent/specimen-data-polish` on 2026-09-19.
No browser, build, test, staging, commit, push, deletion, or source edit was
performed for this review. This file is the only artifact created by the audit.

## Current tree snapshot

| Area | Observed state / size |
| --- | --- |
| Tracked modified/deleted source | 29 paths, including the intentional deletion of `src/components/atmosphere/specimen-fallback.ts` |
| Untracked runtime media to preserve | `microscope-journey-v4.mp4` 2,377,212 B; `opening-v4.png` 505,513 B; `terminal-v4.png` 958,395 B; `retail-pet-clean.webp` 115,010 B |
| Phase E QA tree | 172 files, 55.50 MiB total; playback alone is 40.68 MiB, specimen 12.41 MiB, truth 0.05 MiB |
| Phase F QA tree | 38 files, 12.40 MiB total; microscope evidence is 12.34 MiB |
| Ignored generated/local output observed | `.next/`, `node_modules/`, `dev.error.log`, `dev.out.log`, and Phase E playback `*.log` files |
| Root scratch observed | multiple `local-*` files, including KIE/WAN notes, screenshots, response receipts, upload metadata, and old verification artifacts; these are ignored by `.gitignore` |

The repository ignore policy already excludes `node_modules`, `.next/`,
`out/`, `build`, `coverage`, `.env*`, `*.pem`, `.vercel`,
`*.tsbuildinfo`, `next-env.d.ts`, `local-*`, `.claude`,
`.z-ai-config`, `*.log`, `skills/`, `.aider*`, `.codegraph/`,
`.review/`, and `docs/qa/**/.browser-*/`.

No high-confidence literal credential prefix/private-key/webhook-secret match
was found in the scoped `src`, `scripts/qa`, `docs/qa/phase-e`, and
`docs/qa/phase-f` text scan. This is not permission to stage credentials:
`.env*`, PEM/private-key material, tokens, secrets, webhook URLs, receipts,
and local account/config files remain release-excluded.

## Include in the eventual narrow release stage

| Group | Paths |
| --- | --- |
| Current tracked implementation | All currently modified Phase E/F implementation paths reported by `git status --short`: `scripts/qa/read-path-safety.cjs`, `scripts/qa/run-regression.cjs`, `src/app/api/readings/route.ts`, the modified atmosphere/chart/D3/section/site/lib files, and the tracked deletion of `src/components/atmosphere/specimen-fallback.ts`. These changes are the integrated implementation described by the Phase F coordinator handoff. |
| New implementation/support files | `src/components/sections/donation.css`, `src/lib/assessment-presentation.ts`, `scripts/qa/citizen-notification-safety.cjs`, `scripts/qa/mocks/citizen-discord-webhook.cjs`, `scripts/qa/mocks/citizen-rate-limit.cjs`, `scripts/qa/phase-f-microscope-browser.cjs`, and `scripts/qa/phase-f-microscope-delivery.cjs`. |
| Required runtime media | `public/media/ripple/microscope/microscope-journey-v4.mp4`, `public/media/ripple/microscope/opening-v4.png`, `public/media/ripple/microscope/terminal-v4.png`, and `public/media/ripple/specimen/retail-pet-clean.webp`. These are the approved/served assets. Existing older tracked microscope media are unchanged and need no staging action. |
| Phase F release evidence | `docs/qa/phase-f/HANDOFF.md`, `docs/qa/phase-f/MODERATION_TRUTH_REVIEW.md`, `docs/qa/phase-f/specimen/**`, and `docs/qa/phase-f/polish/**` after worker-4 finishes its owner-controlled browser pass. Include this staging review itself. |
| Phase F microscope evidence | `docs/qa/phase-f/microscope/HANDOFF.md`, `approved-delivery.json`, `tail-discontinuity.json`, `tail-discontinuity-frames84-89.png`, `input/lens-interior-last.png`, and `docs/qa/phase-f/microscope/browser/**`. The browser directory is current final delivery/lifecycle proof, including the normal desktop/mobile recordings and failure/reduced-motion cases. |
| Phase E truth evidence | `docs/qa/phase-e/truth/**` in full. It is only ~0.05 MiB and directly documents the strict missing-data/read-contract changes still present in the implementation. |
| Phase E specimen provenance/context | Keep a narrow subset: `docs/qa/phase-e/specimen/README.md`, `asset-provenance.json`, `results.json`, `review-specimen.cjs`, `typecheck-specimen.cjs`, `typecheck-results.json`, the final `1440-workbench-{macro,uv}.png` and `390-workbench-{macro,uv}.png`, `recordings/layout-{1440,390}.webm`, plus `canvas-unavailable.png`, `image-failure.png`, and `reduced-at-load.png`. Phase F explicitly treats the 390 Phase E material as context, not fresh Phase F proof. |
| Phase E design record | `docs/qa/phase-e/PROVIDER_AND_DESIGN_REVIEW.md` if the release keeps the Phase E provenance/design narrative. It is documentary, not runtime code. |

The final staging command should still be path-narrow and run only after
worker-5 and worker-4 have finished updating their owned evidence. Re-read
`git status --short` immediately before staging because this audit is a
snapshot while those owners may still be writing Phase F QA files.

## Leave untracked / exclude from the release stage

| Group | Paths / reason |
| --- | --- |
| Repo-local agent instructions | `AGENTS.md` and `CLAUDE.md`. They are untracked local agent guidance and the coordinator handoff explicitly says never stage them. |
| Credentials and private/local config | Any `.env*`, `*.pem`, `.claude/`, `.z-ai-config`, `.aider*`, `.vercel/`, tokens, secrets, webhook credentials, or account/session material. None belongs in the release even when Git ignore catches it. |
| Build/dependency/cache output | `.next/`, `node_modules/`, `out/`, `build/`, `coverage/`, `*.tsbuildinfo`, `next-env.d.ts`, `.codegraph/`, `.review/`, and any QA `.browser-*/` profile/cache. These are generated/local artifacts. |
| Local receipts/scratch | Every root `local-*` file currently present, including HCB/KIE/WAN receipts and notes, upload metadata, local screenshots, old preview/failure verification files, Threads inspiration/reference media, and local provider docs. Preserve locally if useful; do not stage. |
| Local logs | `dev.error.log`, `dev.out.log`, and ignored Phase E playback lint/type/diff `*.log` files. |
| Superseded Phase E playback evidence | `docs/qa/phase-e/playback/**` (40.68 MiB) and `scripts/qa/phase-e-playback.cjs`. Its own README says the recorded results concern the old five-second source; Phase F v4 browser/delivery proof supersedes it for release review. Keep locally if historical provenance is desired. |
| Superseded Phase E microscope approach | `docs/qa/phase-e/microscope/**` (2.35 MiB) and `scripts/qa/phase-e-microscope.cjs`. The Phase F handoff establishes the approved v4 path instead. |
| Rejected/unused Phase F microscope candidates | `docs/qa/phase-f/microscope/deterministic-left-eyepiece-approach-v3.mp4`, its probe JSON, `left-eyepiece-entry-input-v3.png`, its decode JSON, and all `wan-rejected-*` artifacts. The handoff marks the deterministic path unused and the first WAN take rejected. Their status is already summarized in the current handoff; they are not needed in the narrow release commit. |
| Raw specimen source/reference images | `docs/qa/phase-e/specimen/assets/**`, including the clean source PNG and branded Great Value reference. The served approved WebP plus `asset-provenance.json` is sufficient for the release tree; raw reference material need not ship. |
| Obsolete specimen failure captures | `docs/qa/phase-e/specimen/layout-*-failure.png`. The specimen README identifies these as early failed-run evidence and points reviewers to the final captures instead. |
| Redundant Phase E specimen capture matrix | The remaining 320/768/1024 detail/workbench screenshot sets and duplicate whole-bottle/detail screenshots may stay local unless a reviewer explicitly requests the complete historical matrix. The narrow subset above retains the desktop/mobile final proof, lifecycle/error proof, results, and reproducibility scripts without staging the entire 12.41 MiB directory. |

Nothing in the exclude table should be deleted by staging cleanup. The
recommendation is only to leave it untracked/ignored or otherwise outside the
narrow release commit.

## Release-stage guardrails

The staging owner should verify that only the intended Phase E/F source,
approved runtime media, and selected evidence are added; inspect
`git diff --cached --name-status` and `git status --short` before any commit.
Do not use broad `git add .` / `git add -A` from the repository root because
`AGENTS.md`, `CLAUDE.md`, the large QA history, and other untracked material
are present. No commit or push was performed by this audit.
