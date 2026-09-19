# Phase F specimen handoff

Worker: `worker-3`
Agent run: `cb123540-ecb3-415b-8ece-0056dcf05976`

The worker tool did not expose an exact ChatGPT chat/conversation ID. None is
guessed here.

## Result

The specimen keeps the Phase E single-photo interaction and now presents a
quieter inspection layer. The whole-bottle retail PET illustration stays clean,
while the separate illustrative UV detail uses fewer, smaller, slower authored
forms. Canvas failure is recoverable in place, the scientific caveats are more
explicit, and the detail has stronger accessible description relationships.

## Changed files

- `src/components/atmosphere/specimen-inspector.tsx`
  - Adds a recoverable `Retry detail` path for transient canvas failures.
  - Keeps failure status text separate from the retry button for accessible
    status semantics.
  - States explicitly that the whole-bottle image has no particle overlay.
  - Links the specimen modes/canvas to the caveat and detail explanation.
  - States that illustrated forms are not to scale.
  - Gives the NIH external link an explicit new-tab accessible label.
- `src/components/atmosphere/specimen-inspector.css`
  - Centers and spaces the recoverable detail-failure state and bounds its copy.
- `src/components/atmosphere/bottle-scene.ts`
  - Reduces UV forms from 16 to 12.
  - Reduces their authored base size from 1.8-3.0% to 0.8-1.34% of the detail
    field, with smaller/slower drift.
  - Uses a slightly lighter editorial overlay so the real source crop remains
    legible behind the separate illustration.
  - Caps continuous UV rendering at roughly 20 fps.
  - Clears stale disposal diagnostics when a failed detail renderer is rebuilt.
- `docs/qa/phase-f/specimen/browser-regression.md`
  - Records the authorized bounded browser regression and its limits.
- `docs/qa/phase-f/specimen/HANDOFF.md`
  - This handoff.

No media, hero/player, API, data-policy, dependency, database, or deployment
files were edited by this worker.

## Source validation

The following bounded checks passed:

```powershell
node node_modules/eslint/bin/eslint.js src/components/atmosphere/specimen-inspector.tsx src/components/atmosphere/bottle-scene.ts

node docs/qa/phase-e/specimen/typecheck-specimen.cjs
# diagnostics: 0

git diff --check -- src/components/atmosphere/specimen-inspector.tsx src/components/atmosphere/specimen-inspector.css src/components/atmosphere/bottle-scene.ts
```

`git diff --check` emitted only the repository's existing LF-to-CRLF advisory.

Running the existing Phase E scoped typecheck helper had one unintended evidence
side effect: because that helper always writes its result, it updated the
untracked `docs/qa/phase-e/specimen/typecheck-results.json` timestamp to
`2026-09-19T12:36:00.611Z`. The TypeScript result remained zero diagnostics.
The exact prior JSON timestamp is not recoverable from git because the Phase E
QA directory is untracked, so this worker did not invent or overwrite a prior
value. Prime was informed immediately and no other Phase E evidence was touched
afterward.

## Browser validation

Prime authorized one bounded Phase F specimen regression in the existing shared
Chrome session. The tab was reused and released afterward.

Desktop checks passed for:

- zero page horizontal overflow;
- 1122 x 1402 retail-PET source image loaded from the expected WebP;
- zero canvas/particle overlay in the whole-bottle overview;
- real pointer movement of the image crop;
- real keyboard movement of the Detail position range control;
- UV settled with exactly 12 small authored forms;
- forced canvas-render failure followed by an actual `Retry detail` click and
  successful renderer recreation;
- reduced-motion branch settling with no running animation frame;
- offscreen suspension and resumption;
- document-hidden suspension without render-count growth;
- specimen image requests returning HTTP 200.

Exact values and methods are in `browser-regression.md`.

## Limits

A fresh exact 390 px Phase F viewport could not be produced through the shared
browser connector. Its page viewport remained 1280 CSS px wide after native
window resize, and a 390 px iframe check was blocked by the page/browser framing
policy. The iframe was removed and the Chrome window restored before release.
Existing Phase E 390 x 844 evidence is useful context for the unchanged
responsive structure, but it is not claimed as fresh Phase F proof.

Reduced motion and document-hidden checks in this pass used bounded in-page
simulation of the relevant browser state. The console also contained Next
development HMR/Back-Forward-Cache WebSocket errors from page reload activity,
so this pass does not claim a clean zero-console-error run.

The bottle remains an illustrative generated retail-PET image, the crop controls
are image enlargement rather than calibrated microscopy, and the UV forms are
authored examples rather than detected particles, a material identification, or
a measurement.
