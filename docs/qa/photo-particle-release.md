# Photo-derived particle release — 2026-09-19

The hero replaces the large illustrated chunks with 160 small decorative instances of 11 transparent photo-derived textures; 101 are visible on narrow screens. Category selection, pointer repulsion, pause, reduced-motion and offscreen suspension remain available. The approved microscope video is unchanged and its exact terminal poster dissolves into the new composition; this is not an exact geometry match to the video.

ParticleAtlas uses larger cutouts and displays the selected original source photograph with its license. Sample examination uses a cropped/relit Raman microscope detail. Sources, derivative disclosures and the complete built-in imagegen prompts are in `public/media/ripple/photographs/README.md` and `public/media/ripple/photo-cutouts/README.md`. Stock preview links were visual references only.

Verification:

- `scripts/qa/photo-particle-motion.cjs`: six passes, Chromium/WebKit at 1280, 414 and 320px. Checks 160 instances / 11 requested texture URLs, decode, highlight, mouse response, stationary lighting, pause, reduced motion, offscreen suspension, replay/skip, working HTML search and no overflow/inert locks.
- `scripts/qa/intro-handoff-regression.cjs`: eight passes per engine. Normal-speed desktop/mobile recordings, matching video/poster rectangle, visible dissolve, replay, source-photo panels, reduced motion, Escape, disabled animation, artwork failure and video failure. APIs were stubbed unavailable; these checks do not assert live utility data.
- A WebKit dissolve stall with per-particle filter effects was reproduced. Removing those effects from the dense hero resolved it; all eight WebKit checks subsequently passed.
- Scoped ESLint passed. Screenshots inspected at desktop and phone widths. Browser emulation is not physical iPhone XR testing.

Local evidence: workspace `outputs/dense-motion-final`, `outputs/dense-intro-chrome`, and `outputs/dense-intro-webkit-final`. Each contains result JSON and screenshots; intro folders include normal-speed WebM recordings. The Chrome intro recording precedes the final scatter-position and rendering-cost adjustments; final motion tests and WebKit recordings cover those changes.
