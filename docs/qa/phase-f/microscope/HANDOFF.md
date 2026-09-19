# Phase F microscope handoff

Owner: `worker-5`

The user watched the replacement take, explicitly approved its microscope/lens motion, then requested the late endpoint snap be cut. The authoritative delivery is therefore the approved take through its last clean frame, with the prior deterministic approach preserved only as unused evidence.

## Preserved inputs

| Artifact | Media facts | SHA-256 | Status |
| --- | --- | --- | --- |
| `deterministic-left-eyepiece-approach-v3.mp4` | 1920×1080, H.264/yuv420p, 30 fps, 60 frames, 2.000000 s, 769,441 bytes | `7B335CDEBF89AEAA65A2EA96EC3CA13ED15A47255E8CCDC21A1E8F1F7D4D6092` | Preserve as **UNUSED candidate evidence**. Current retry direction no longer splices this into delivery if the full take succeeds. |
| `left-eyepiece-entry-input-v3.png` | 1920×1080, rgb24 PNG, 547,968 bytes | `C6FB36F820528DDA0C1C8E38B5F3A779272042770653B913B9F4E47654388C37` | Preserve as **UNUSED candidate evidence** paired with deterministic approach v3. |
| decoded terminal RGB of approach v3 | 1920×1080 rgb24 | `C9FB57E9F6255A22EB9873D5E3699F4AFF05D189FC21F53DD9E895B28DD7CE7C` | `left-eyepiece-entry-input-v3-decode.json` records `exactDecodedTerminalMatch: true`. |
| `input/lens-interior-last.png` | 1672×941, rgb24 PNG, 1,486,930 bytes | `00C51AA16E81897A974A7AB3EE9E43E53E11FB552E3249E80C93035E3C1ADAA2` | Preserve. Exact copy of `C:/Users/ayada/Downloads/ChatGPT Image Sep 19, 2026, 07_35_05 AM.png`; required visual endpoint for the retry. |

## Rejected WAN take

The first WAN candidate, `C:/Users/ayada/Downloads/wan-3-video-0743149d-5493-4dfc-a865-93549484e45d.mp4`, is permanently rejected for this handoff. Its SHA-256 is `B6946427A84D29C48E38A31AB4299A3E6BA4D45B611116013DA6F56A75BC13EF`. Probe evidence in `wan-rejected-probe.json` records H.264/yuv420p, 1280×720, 30 fps, 90 decoded frames, 3.018005 s, and 3,239,530 bytes.

The rejection reason is geometric: the generated motion fuses the two eyepieces/oculars instead of keeping one rigid viewer-left ocular as the physical entry target. That take must never be integrated or described as physical lens entry. `wan-rejected-contact-sheet.jpg` and `wan-rejected-keyframes.jpg` are the preserved visual evidence.

## Approved full take

Approved source: `C:/Users/ayada/Downloads/wan-3-video-53cbd3dc-82bb-4832-9a0b-65a6c50fcc61.mp4`.

The source is 3,697,477 bytes with SHA-256 `1874274321D1A9B9A596AF65563166468B769A2420C2D8E79CEC1B99934ED47C`. ffprobe records H.264 High/yuv420p, 1280×720, 30 fps, 90 decoded frames, and native duration 3.065011 s.

The accepted motion follows the requested full-take path: it starts from the full microscope with both rigid eyepieces visible, advances toward the viewer-left eyepiece, lets the viewer-right eyepiece leave the rectangle intact as framing tightens, and crosses through the viewer-left glass into the supplied optical-interior endpoint. The previously rejected fused-eyepiece WAN take remains disqualified and is not used anywhere in delivery.

Frame-level inspection of the final second found the late snap at **source frame 89** (PTS 2.966667 s, scene-change score 9.371). **Source frame 88** at PTS 2.933333 s is the last kept clean frame. A stream-copy trim retained frame 89 because of the source GOP/B-frame structure, so the authoritative delivery required a frame-accurate H.264 re-encode of source frames 0–88 at the same 30 fps. No frame interpolation, padding, speed change, generated filler, editorial fade, dip-to-black, portal substitution, or deterministic approach was added.

Compact cut evidence is preserved in `tail-discontinuity-frames84-89.png` (3×2 tile ordered source frames 84, 85, 86 / 87, 88, 89; SHA-256 `39034539F5469C1E239A1A3E4827C3B8CFF591C4E64621698BABB31490440B03`). `tail-discontinuity.json` supplies the matching frame indices, PTS values, scene-change score, and explicit keep/drop decision.

## Integrated versioned delivery

| Artifact | Facts | SHA-256 |
| --- | --- | --- |
| `public/media/ripple/microscope/microscope-journey-v4.mp4` | authoritative trim; 1280×720, H.264 High/yuv420p, 30 fps, 89 frames, 2.966016 s, 2,377,212 bytes | `28031DA7910E070684F0423B9794E6E50CB31D5CB0465A66BE880F6913A32AF8` |
| `public/media/ripple/microscope/opening-v4.png` | exact decoded authoritative frame 0, 1280×720 rgb24 | `627DE265DE9FA200B088E59B0176FFE1AB7AFCA9A5760036A70AABA8A219D818` |
| `public/media/ripple/microscope/terminal-v4.png` | exact Chrome-decoded authoritative frame 88, 1280×720; not black | `1618771967958B7464FE7D04A6E8A352810C3A6C863A670122C89F191F696302` |

Decoded RGB proof:

- frame 0 / opening poster RGB SHA-256: `D9792F955657D9925D4FD4DF975BDFA74A2AEE073721DF096A5B608685FB9964`
- frame 88 / FFmpeg RGB SHA-256: `ED753D72D4EB11C3A17D3FB2B025692905E9B51729B9FC0D1EB22FFF2613432B`
- frame 88 / Chrome browser RGB SHA-256 and live terminal poster: `327A4CE407A0634D6E8F87B81C83F046E8BF3A773D9C568D8A392F0D14CC08A4`
- The first controlled browser pass already had correct frame identity, geometry, timing, and natural-ended behavior, but Chrome's YUV→RGB conversion differed from the initial FFmpeg frame-88 PNG by 1,797,570 of 2,764,800 RGB bytes, with max channel delta 5/255 and mean absolute delta 0.734543. That bounded variance was same-frame color conversion, not wrong-frame evidence.
- On the controlled Chrome 152.0.7977.83 / forced-sRGB path, the saved 1440×900, 390×844 and 320×568 terminal captures are byte-identical to the live `terminal-v4.png` representation of canonical source frame 88. This is a claim about this controlled Chrome path only; it is not a cross-browser byte-exactness claim.

`src/lib/artwork-journey.ts` now points to the three v4 files and records native `width: 1280`, `height: 720`, and authoritative `durationSeconds: 2.966016`. Its `terminalPoster` is the actual decoded final clean lens-interior frame, which remains painted underneath during the live handoff boundary.

`docs/qa/phase-f/microscope/approved-delivery.json` contains the machine-checked delivery/poster proof. `scripts/qa/phase-f-microscope-delivery.cjs --verify-live --write-report` reproduces it, verifies both saved browser terminal proofs against the public poster, records the bounded FFmpeg/Chrome conversion delta, and refuses hash changes to the reviewed fixed evidence.

## Authoritative intro UX

The transport-era Phase E visitor UI has been replaced. A fresh first visit now opens a true viewport cover using the exact `opening-v4.png` still with real HTML copy, a primary **Enter** button, and one discreet **Skip intro** action. The MP4 is neither mounted nor requested before Enter. Enter starts the approved `microscope-journey-v4.mp4` at its native rate and duration. The video has no visible progress bar, timecode, stage label, Pause/Restart controls, or playback Skip overlay.

The cover, video, terminal handoff, and entering artwork all use the same fixed viewport media rectangle with dark contain fill. This is verified at 1440×900, 390×844 and 320×568; the complete eyepiece path remains inside the viewport on both portrait sizes. During cover/video/entering, the document is scroll-locked, underlying page controls are inert, and external `.site-header`, the floating `Open search (Cmd+K)` trigger, and `Scroll to top` control are suppressed. Cover Skip remains topmost/hit-testable. The external chrome and exact prior scroll position restore on live/error/skip cleanup.

Escape skips from all three relevant phases: cover, active video, and artwork entering transition. Cover Skip does not request the video. After completed or skipped entry, the homepage action reads **Replay intro**; a same-session reload bypasses the cover and video request while preserving Replay. Reduced-motion users bypass the cover/video and receive the existing static/live experience. The real homepage search input stays mounted and is preserved through playback/Replay.

The artwork-field renderer itself is unchanged. The existing pause gate is now asserted while the fullscreen cover is open, so the idle artwork RAF/draw count does not advance invisibly behind the still. The live field resumes after Enter/handoff or cover Skip. All five reviewed artwork requests remain successful and **Highlight a form → Fibers** still responds after handoff.

Playback still preserves guarded play-promise recovery, native-ended completion, failed decode/request retry, rejected-`play()` retry, offscreen suspension, reduced-motion handling, Escape handling, callback/timer/observer cleanup, and detached source release.

### End-frame flash regression

Natural completion no longer calls `removeAttribute('src')` / `load()` while the ended video is still connected. Completion retires future playback work while leaving the final decoded frame painted; destructive decoder reset is deferred until React has detached the video. The deferred cleanup is epoch-guarded so a Strict Mode cleanup cannot clobber a newer effect owner.

The browser harness wraps `HTMLMediaElement.prototype.load` and journey-video `removeAttribute('src')`, and a capture listener marks native `ended` before the component handler. For first entry and natural Replay at all three viewport sizes there are **zero** destructive operations with `afterEnded && isConnected`; the saved cleanup records show `remove-src` and `load` only after `isConnected:false`. Detached source cleanup still completes.

Each normal recording is also scanned frame-by-frame around both native `ended→entering` boundaries against fitted opening-v4/frame0 and terminal-v4 references. All six scans report `openingLikeCount: 0`:

- 1440×900: first handoff 14 scanned frames; Replay 13;
- 390×844: first handoff 14; Replay 13;
- 320×568: first handoff 13; Replay 13.

The corresponding analysis JSON files are `browser/normal-WIDTHxHEIGHT-handoff-frame-analysis.json`.

## Validation and limits

Validated locally by `worker-5` with bounded source/media checks and quiet/headless Chrome 152.0.7977.83 runs against the existing `http://localhost:3020` server. Browser ownership remained serial; no concurrent heavy browser worker was used:

- ffprobe metadata and SHA-256 checks for all fixed v3/rejected artifacts;
- exact recorded decoded-terminal match for approach v3 via `left-eyepiece-entry-input-v3-decode.json`;
- Node syntax and `--verify-live --write-report` delivery verification for `scripts/qa/phase-f-microscope-delivery.cjs`;
- Node syntax, scoped ESLint, full TypeScript `tsc --noEmit --incremental false`, and `git diff --check` for the owned intro changes;
- approved-source provenance, exact frame-cut provenance, exact opening-frame proof, and exact Chrome-decoded terminal proof;
- focused media-op instrumentation proving no connected decoder reset after native end;
- offline frame scan of first and Replay handoff windows proving no opening/frame0 reappearance.

Browser evidence is under `docs/qa/phase-f/microscope/browser/**`. `results.json` reports **11/11 passing checks**, `passed: true`, and `browserClosed: true` (SHA-256 `7C7AD146E8DEBC09105B7F56257AD293752B258936A61BBD3C9215F11A2C5590`). Each fresh first-visit cover uses `/media/ripple/microscope/opening-v4.png`, has zero pre-Enter MP4 requests, keeps Skip hit-testable, suspends the artwork clock, and hides external chrome. After Enter, all three normal journeys use successful v4 delivery, trusted native `playing/ended`, rate 1, no seeking/error, exact browser duration 2.966016 s, a clean overlay-free video, same media rectangle at terminal→entrance=0, and settled entrance=1.

Wall playback was 2.958400 s at 1440×900, 2.960200 s at 390×844, and 2.956300 s at 320×568. All three runs preserve search, load the five real artwork images successfully, verify Fibers highlighting, naturally complete Replay, and prove returning-session bypass with zero extra media requests.

Fresh lifecycle cases pass cover Skip, cover Escape, video Escape, entering-transition Escape, reduced-motion bypass, invalid-video decode retry, rejected-`play()` retry, offscreen suspension/resumption, and detached-source/scroll/inert cleanup. Final authoritative QA intentionally does **not** synthesize or foreground/minimize visible Chrome solely to force `document.hidden`; this is the one bounded limitation. The unchanged controller still gates suspension on `document.hidden` and retains its `visibilitychange` listener, while prior Phase E playback evidence documents the preserved visibility-suspension lineage. Offscreen suspension is freshly exercised here.

Recordings:

- `normal-1440x900.webm` SHA-256 `0710F46B12006A78F47E9E23F85BBA1DF234D219B1AA41B17F6F0EEC23FA8013`;
- `normal-390x844.webm` SHA-256 `0358EAEDDFFDE09A14F7E84EEB7BB3249B86E9E3CC24A4C909B643B458CC8F80`;
- `normal-320x568.webm` SHA-256 `FCD5BDD3307B61F83AB12F52B04FAC7B55A7B3CCBB42FA8CC41DC70C7172D74D`.

The browser process was closed after the run. No provider job was submitted by this worker, no generation credit was spent by this worker, no database write occurred, and no commit or push was performed.
