# Unfinished encoding recipe — reference only

This preserves the candidate encoding work inspected before hardening `scripts/phase-b-source-render.cjs`. No full candidate sequence was rendered or encoded during source recovery QA. The executable script now performs bounded still verification only. This document is an inert reference, not an approved promotion or live handoff procedure.

The previous script rendered the terminal still first, then, unless `--still` was supplied, captured 120 PNG frames with this sampling rule:

```js
for (let i = 0; i < 120; i++) {
  scene.renderAtSeconds(i / 119 * 4);
  // Capture canvas PNG as frame-000.png through frame-119.png.
}
```

The old work directory was `../shared-render`; it automatically wrote encoded output and decoded posters to `public/media/ripple`. Those output paths have been removed from the executable utility. Any future authorized experiment must use an isolated directory under `docs/qa/phase-b/source-recovery`, validate the approved source file before rendering, and leave product media promotion to a separate reviewed step.

The planned input was `MICROSCOPE_SOURCE`, an approved Phase A MP4. The original recipe performed no size, frame-rate, frame-count, source-hash, or color metadata preflight; those are unresolved requirements for any future encoding utility. `FFMPEG_PATH`, when set, selected an installed executable. No executable is invoked by the current source renderer.

The exact filter graph was:

```text
[0:v]trim=start_frame=0:end_frame=142,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[a];[1:v]trim=start_frame=4:end_frame=120,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]
```

The associated FFmpeg argument recipe, using symbolic names for paths, was:

```text
-y -v error
-i APPROVED_PHASE_A_MP4
-framerate 30 -i CANDIDATE_FRAMES/frame-%03d.png
-filter_complex FILTER_GRAPH_ABOVE
-map [v]
-c:v libx264 -preset slow -crf 17 -r 30 -pix_fmt yuv420p
-color_range tv -colorspace bt709 -color_trc bt709 -color_primaries bt709
-movflags +faststart
intro-shared-1080.mp4
```

This retains source frames 0–141 (142 frames) and candidate frames 4–119 (116 frames). If both inputs meet the assumed 30 fps contract, the result has 258 frames, with terminal frame 257 at PTS `257 / 30`. Candidate source index `i` maps to composite index `138 + i`. Source-scene time remains `4 * i / 119`, so its derivative per video second is `120 / 119`, not 1.

The previous plan extracted two lossless WebP posters from the newly encoded candidate sequence:

```text
-y -v error -i intro-shared-1080.mp4
-vf select=eq(n\,0) -frames:v 1 -c:v libwebp -lossless 1
microscope-poster-shared.webp

-y -v error -i intro-shared-1080.mp4
-vf select=eq(n\,257) -frames:v 1 -c:v libwebp -lossless 1
continuation-terminal-shared.webp
```

Tagging an encode as BT.709 does not establish that canvas RGB, transfer functions, range conversion, video decode, and display compositing match. The old graph contained no explicit calibrated RGB-to-video color conversion and no measured decoded-video/live comparison. These names describe unfinished candidate outputs; they are not aliases for the supplied timing proof or the production terminal poster.

The recovered historical Python recipe is preserved separately, unchanged, as `render-continuation-original.py`. It captures JPEG at quality 0.95 before H.264/VP9 encoding and contains hard-coded original-machine output paths. It was inspected as provenance and was not executed in this run.
