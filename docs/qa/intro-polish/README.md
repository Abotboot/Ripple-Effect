# Replay, terminal frame and layered artwork

The previous replay immediately played the clip and restored the visitor's old scroll position. It now resets scroll and Lenis momentum, opens the same Enter cover as first visit, and waits for Enter. Skip/Escape unlock the page. Natural completion reveals real HTML over the exact terminal poster; the old automatic canvas entrance/zoom is gone. Choosing a particle category explicitly opens the preserved master artwork.

Video and terminal poster use the same viewport rectangle and contain fitting. A low-resolution canvas extends the same video frame into a blurred background, using the single existing video decoder. Posters provide matching background extensions. Stable scrollbar space prevents a width jump when scroll locking ends. The microscope video itself is unchanged.

Dark theme is forced, including old saved light preferences; the theme toggle and drifting cursor implementation are removed. The bottle UV renderer and its controls are deleted. Bottle image detail remains interactive through region selection, position and 2–4× enlargement, without a continuous animation loop.

Cards use three new alpha cutouts above stationary water/light layers. Pointer movement, keyboard selection and touch/click selection work independently of the lighting. Original stills remain available in disclosures. Repeated hero, atlas, bottle and narrative caveats were consolidated; missing-data labels, source provenance and study scope remain.

## Bounded browser checks

Checked in the hidden Codex browser at 1280×720 and 320×568:

- Fresh Enter cover; one video at playbackRate 1; no autoplay before Enter.
- Replay after scrolling into the atlas returns to the cover, scrollY 0, Enter focused, no video yet.
- Natural end: live state, terminal poster retained, old canvas opacity 0, no video left mounted, scrollY 0.
- At 320×568, video and terminal media bounds both x0/y0/width304.6667/height568 (desktop scrollbar emulation reserves 15.3333px); search bottom474.8334 stays within viewport.
- Cover Escape and Skip: no remaining inert nodes, fixed body or overflow lock.
- All nine particle image instances load. Keyboard ArrowRight changes the selected form; Pause stops motion. Light-layer transform remains `none`.
- Bottle Ribs and 4× controls update the detail. No UV option, custom cursor or light-mode toggle remains.
- No horizontal overflow on the checked desktop/mobile layouts.

Native Safari and real touch hardware were not tested. Reduced motion and tab-hidden gates were reviewed in source, not simulated in this browser pass. The prior phase-F browser recordings predate these changes and are not claimed as current proof.

## Design reference

[The user's X article](https://x.com/prajwaltomar_/status/2100211370897920136) was read through its public article metadata after X denied the normal fetch. Applied ideas: retain a coherent design system, prioritize specific useful content, and make one focused refinement pass. No referenced site's artwork, code or branding was copied.

## Build verification
Full TypeScript, scoped ESLint, git diff whitespace check and Next.js production build passed after the final changes. Local API credentials remain unavailable in the development environment; public production reads are checked separately after deployment. No API/database code changed in this pass.
