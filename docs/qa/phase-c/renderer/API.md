# Artwork field integration

`src/lib/artwork-field.ts` exports `createArtworkField(canvas, { master, boundary })`.
Both image elements must be decoded before construction. Use the existing
`/media/ripple/particle-world-master.webp` as `master`. The returned object supports:

```ts
field.resize(cssWidth, cssHeight, window.devicePixelRatio)
field.render({
  time: elapsedSeconds,
  entrance: 1,
  category: 'all', // 'fibers' | 'fragments' | 'granules'
  pointer: null, // { x, y } in normalized canvas coordinates, from 0 to 1
  // impulse: { x, y, strength }, with strength supplied/decayed by the caller
})
field.getDiagnostics()
field.dispose()
```

The owner controls RAF, reduced-motion policy, visibility, image loading, event
listeners, and CSS dimensions. Stop advancing `time` to stop drift. The renderer
has no listeners, timers, WebGL, network requests, or asynchronous resources.
`dispose()` is idempotent, releases its cached canvases and image references,
and clears the output; subsequent `render` or `resize` calls throw.

`entrance: 0` draws only the supplied decoded boundary image using centered cover,
without artwork, category dimming, interaction or time-dependent pixels. At native
1920 by 1080 with DPR 1 this is an unscaled image draw. Other dimensions are the
same centered-cover scaling a standalone canvas image would use. Entry combines
optical opacity emergence, a restrained forward artwork-camera move from scale
.94 to 1 around the existing particle area, and small depth-scaled local offsets
that ease outward toward the master positions. These use quintic easing with zero
first and second endpoint derivatives. Exposed borders are cleared each frame.
This is a 2.5D camera/opacity transition of artwork, not volumetric optical continuity.

`entrance: 1, time: 0, category: 'all', pointer: null` draws the master itself.
Known regions of that image gain small, deterministic feathered translations as
time advances or the pointer/impulse changes. No shapes or particles are generated.
The exact inputs determine each frame; there is no hidden integrated simulation.
On portrait viewports, the artwork's existing particle area is centered at source
x=.755; landscape preserves the original centered composition. Boundary always
uses centered cover. DPR is bounded to 2, 4096 per dimension and about 8.4 million
pixels. CSS sizing remains the owner's responsibility.

Category labels describe manually annotated artwork regions. Non-target artwork
is dimmed, and target image patches retain their original light and color. They
do not identify contaminants or establish counts, dimensions, concentrations, or
water quality. Use the product label **interactive artwork**.

`ARTWORK_REGIONS` and `getArtworkEntrance(entrance)` are exported for inspection
and endpoint-easing QA. `getDiagnostics()` reports
canvas/backing sizes, retained region/cache counts, approximate owned cache bytes,
render count, most recent/max JS draw-submission time, camera scale, local region
offsets, max local displacement, entrance/category and disposal. Its timings are
not presented-frame or GPU timing.

Recovered assets are `/media/ripple/live/microscope-original.mp4`,
`/media/ripple/live/microscope-opening.webp` and
`/media/ripple/live/microscope-terminal.webp`. Use the terminal poster for `boundary`.
Completed isolated verification, provenance and reproduction commands are in
[README.md](./README.md). No controller, page, registry or production handoff change
is made by this module.
