# Replay, terminal frame and layered artwork

Replay resets scroll and Lenis momentum, opens the same Enter cover as first visit, and waits for Enter. Skip/Escape unlock the page. A regression held the microscope terminal poster indefinitely. Natural completion now dissolves that exact, unchanged frame over 1.1 seconds into the preserved particle master, then reveals the real HTML and resumes artwork interaction. The field uses its settled camera framing throughout; there is no second zoom. A 1.6-second fallback releases the page if animationend is suppressed.

Video and terminal poster use the same viewport rectangle and contain fitting. A low-resolution canvas extends the same video frame into a blurred background, using the single existing video decoder. Posters provide matching background extensions. Stable scrollbar space prevents a width jump when scroll locking ends. The microscope video itself is unchanged.

Dark theme is forced, including old saved light preferences; the theme toggle and drifting cursor implementation are removed. The entire bottle inspector is now removed from home and motion-study. Its old anchor still reaches the sample-examination section.

Cards use three alpha cutouts above stationary water/light layers. Pointer movement, keyboard selection and touch/click selection work independently of the lighting. The original-illustration disclosures are removed. Repeated historical-data paragraphs and public residents-served displays are removed, including printed/shared reports. Missing-data labels, source provenance and scoring eligibility remain unchanged. The utility dialog opts out of Lenis interception so its inner region scrolls natively with wheel, keyboard and touch.

## Bounded browser checks

Checked in the hidden Codex browser at 1280×720 and 320×568:

- Fresh Enter cover; one video at playbackRate 1; no autoplay before Enter.
- Replay after scrolling into the atlas returns to the cover, scrollY 0, Enter focused, no video yet.
- Natural end: entering state with visibly decreasing terminal-layer opacity, then live state with that layer and video removed, master artwork visible, canvas entrance 1 and running, scrollY 0.
- At 320×568, video and terminal media bounds both x0/y0/width304.6667/height568 (desktop scrollbar emulation reserves 15.3333px); search bottom474.8334 stays within viewport.
- Cover Escape and Skip: no remaining inert nodes, fixed body or overflow lock.
- All nine particle image instances load. Keyboard ArrowRight changes the selected form; Pause stops motion. Light-layer transform remains `none`.
- No bottle inspector or original-illustration disclosure remains on home or motion-study. The sample link and particle selection still work.
- No horizontal overflow on the checked desktop/mobile layouts.

New regressions in scripts/qa/intro-handoff-regression.cjs and scripts/qa/utility-scroll-regression.cjs passed in headless Chrome at 1280×720 and 320×568. Normal-speed intro/replay recordings were captured locally. Reduced motion, Escape during handoff, disabled CSS animation, artwork failure and video failure all release to usable HTML. Wheel scroll advanced the utility panel from 0 to 450 pixels at both sizes; PageDown advanced it further, background scroll stayed fixed, and Escape restored the page. Utility tests use read-only public records intercepted into the local browser, without a database write. Native Safari and real touch hardware were not tested.

## Design reference

[The user's X article](https://x.com/prajwaltomar_/status/2100211370897920136) was read through its public article metadata after X denied the normal fetch. Applied ideas: retain a coherent design system, prioritize specific useful content, and make one focused refinement pass. No referenced site's artwork, code or branding was copied.

## Build verification
Full TypeScript, scoped ESLint, git diff whitespace check and Next.js production build passed after the final changes. Local API credentials remain unavailable in the development environment; public production reads are checked separately after deployment. No API/database code changed in this pass.
