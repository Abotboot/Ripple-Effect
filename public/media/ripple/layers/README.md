# Particle layers

Generated with the built-in imagegen tool on 2026-09-19 from the user's two particle references. No external paid API or video generation was used. The tool did not expose a model-version selector; no specific “2.5” model is claimed.

Files: `fiber.png`, `fragment.png`, `granule.png`. Each is 1254×1254 RGBA. Alpha was verified to include transparent pixels (0), opaque pixels (255), and intermediate coverage. The generated originals remain in the user's Codex generated-images directory.

These are independent foreground cutouts. Stationary water/light backgrounds live in `particle-atlas.module.css`; translation and rotation apply only to particle wrappers. Motion pauses offscreen, when the document is hidden, when the visitor pauses it, and under reduced motion. Originals remain available through each card's “View original illustration” disclosure.

## Prompt set

Common prefix: “Use case: background-extraction. Asset: independent foreground layer for an educational water-particle motion graphic.”

Fragment: “Recreate ONLY the large delicate translucent crumpled clear fragment from the reference as an isolated particle cutout, centered, occupying 65% of the square canvas. Preserve its irregular folded silhouette and silver fine textured edges. No surrounding fibers or granules.”

Fiber: “Recreate the delicate silver curved thread-like fiber from the reference as one complete isolated particle cutout, centered fully inside a square canvas, occupying 70% diagonal length. Extend the cropped end naturally; preserve fine parallel striations and slight wispy surface texture.”

Granule: “Recreate one small irregular pale beige translucent granule like the distant grains in the reference, but sharply resolved as an isolated particle cutout. One compact softly faceted rough grain, not a gemstone, centered occupying 40% of a square canvas.”

Common suffix: “Actual transparent alpha background, including semi-transparent interior where appropriate. Photoreal macro texture, soft neutral silver light on the object only. IMPORTANT: zero background water, no teal rectangle, no light beam, no rays, no bloom halo, no cast shadow, no bokeh, no text, no other objects. The water backdrop and light will be separate stationary CSS layers. Output a square transparent PNG.”
