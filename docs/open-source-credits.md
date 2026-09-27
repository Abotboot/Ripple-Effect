# Open-source motion credits

Several animations on the site are adapted from open-source projects. Where a
package is installed, its license ships with it in `node_modules`. Where we
adapted a technique or rebuilt a component, the original is credited here and
in a comment at the top of our file.

| Project | License | What we use | Where |
| --- | --- | --- | --- |
| [Magic UI](https://github.com/magicuidesign/magicui) | MIT | Ripple (concentric rings), AnimatedBeam (beams measured from real node positions), OrbitingCircles (rotate / translate / counter-rotate orbit), TextReveal (words light up on scroll) | `src/components/hero-art/ripple-rings.tsx`, `source-beams.tsx`, `partner-orbits.tsx`, `src/components/motion/scroll-words.tsx` |
| [motion-primitives](https://github.com/ibelick/motion-primitives) | MIT | AnimatedBackground (a highlight that glides between options), TextShimmer (loading text), TransitionPanel (direction-aware section changes) | `src/components/motion/glide.ts`, `.text-shimmer` in `motion.css`, `src/app/page.tsx` |
| [NumberFlow](https://github.com/barvian/number-flow) | MIT | The odometer look for numbers: digit columns spin to their value, fading at the edges | `src/components/motion/rolling-number.tsx` |
| [AutoAnimate](https://github.com/formkit/auto-animate) | MIT | The FLIP technique for lists that reflow when filtered | `src/components/motion/flip-list.ts` |
| [Rough Notation](https://github.com/rough-stuff/rough-notation) | MIT | Hand-drawn underlines that draw themselves (installed package) | `src/components/motion/annotate.tsx` |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | ISC | A burst of water droplets when a reading or report is submitted (installed package) | `src/lib/celebrate.ts` |
| [Sonner](https://github.com/emilkowalski/sonner) | MIT | Toasts that stack, expand on hover and swipe away (installed package) | `src/components/ui/sonner.tsx`, `src/hooks/use-toast.ts` |

## Why some are rebuilt rather than installed

The site has to stay smooth on low-end phones, so every animation was
measured on a throttled phone profile before it shipped:

- **NumberFlow** animates CSS variables. The browser recalculates those on the
  main thread every frame, which cut phone scrolling from 60 to about 30 frames
  a second while numbers rolled. Our version slides a strip of digits with a
  plain transform, which the GPU runs alone.
- **AutoAnimate** checks every list item on a two-second timer for as long as
  the page is open. Our version measures only when a list actually changes,
  so an idle page does no work.
- **Magic UI** animates its beams and text reveal from JavaScript on every
  frame. Ours use CSS: a dash along each beam that plays a few rounds and then
  rests, and a scroll timeline for the text, so the browser drives them.
