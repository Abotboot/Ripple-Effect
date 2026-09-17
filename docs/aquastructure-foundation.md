# Human Aquastructure: foundation and narrative stages 01-04

## Stage 04: The Counter-Measure
- Added responsive editorial CTA and glass panel to the existing WaterNarrative component. No new dependency, router or API changes.
- Primary link uses the existing `#submit` view; secondary link targets the homepage `#search` anchor. Citizen-reading copy matches the current API, without promising pre-publication moderation or a safety verdict.
- Final production build tested at http://localhost:3014. `QA_URL=http://localhost:3014 node scripts/countermeasure-smoke.mjs` passed served markup and CSS checks. This smoke test does not execute client navigation.
- `QA_URL=http://localhost:3014 bash scripts/countermeasure-check.sh` passed mobile width, stable unobstructed CTA and real click navigation to the submission form. The original acceptance test failed with Stage 04 missing before implementation. Click readiness now checks geometry instead of assuming an arbitrary delay.
- Existing narrative and siphon browser scripts passed against the same build. Secondary-link keyboard activation preserved the homepage and selected `#search`; Stage 04 mobile content bounds passed.
- Atmosphere ESLint, particle/audio checks, production build and diff whitespace checks passed. Build skips TypeScript validation; this is not a clean type-check claim. Existing database configuration mismatch still blocks end-to-end data operations. No reading was submitted.
- Reviewed desktop and mobile screenshots: `C:/Users/ayada/AppData/Local/Temp/countermeasure-desktop.png` and `C:/Users/ayada/AppData/Local/Temp/countermeasure-mobile.png` (temporary local artifacts).
- Direct verification only, no independent-review approval. No deployment performed. Remaining: Macro/UV specimen inspector, magnetic cursor, full-site reskin and deployment.

## Historical implementation records
The sections below describe earlier batches and their status at that time.

## Narrative follow-up
- Added `water-narrative.tsx` / `water-narrative.css`: editorial stage 01 and scroll-driven stage 02 counter, with GSAP and SplitType dependencies.
- Linked the NIH research summary. Approximately 240,000 particles per liter is a study average across three bottled-water brands, not a personal ingestion count or measurement of the visitor's water.
- Lenis scroll events update ScrollTrigger. Large/tall screens pin stage 02; smaller screens retain native document flow. Reduced motion shows the final count without pinning or word animation.
- Fixed entry-gate scrollbar restoration leaving a pin spacer 15px too wide. The entered-state effect refreshes ScrollTrigger after the gate unmounts.
- Regression: `QA_URL=http://localhost:3012 bash scripts/narrative-check.sh` (requires attached agent-browser session `ripple-qa`, normal motion). Observed FAIL before fix, PASS after fix for entry width; pinned midpoint and mobile width/native flow also passed.
- Reduced-motion static 240,000 and no pin verified separately. Preview for this follow-up: http://localhost:3012.
- Independent review was not completed; invalid delegation calls produced no review. User explicitly directed final build/lint and a direct commit without further delegation. Verification here refers to executed checks, not independent-review approval.
- The original foundation record below is historical. Stages 03/04, bottle inspection, magnetic cursor and full-site reskin remain unfinished. No deployment performed.

## Stage 03: The Anatomic Siphon
- Pinned desktop horizontal scrub across four research waypoints; mobile, short and reduced-motion layouts stack in native flow with no pin and no off-screen content.
- Copy checked against the NIH summary (2024 SRS microscopy study, three brands, ~240,000 particles/L, ~90% nanoplastics; particles reported in human blood, lungs, placenta; health effects unproven). Stage frames detection vs consequence; includes Evidence and limits link. It does not claim a proven bottle-to-blood route or personal exposure.
- Fixed during verification: mobile waypoint clipping, desktop pinned panel exceeding viewport, heading size, and stale-transform assertion (GSAP reverts to identity, not "none").
- Regression: `bash scripts/siphon-check.sh` on an attached `agent-browser` session (production build, port 3012): mobile waypoints, desktop pin fit and midpoint scrub, final waypoint reachability, reduced-motion readability and cleanup, short-viewport fallback all PASS.
- `npx eslint src/components/atmosphere`, `node scripts/tank-check.mjs`, `npm run build`, `git diff --check` passed. Local Prisma/SQLite error remains environmental and unrelated.
- Committed d66e2dc. Independent review was not completed (invalid delegation calls again); verification = executed checks above. Stages 04, bottle inspection, magnetic cursor and full-site reskin remain.


## Scope
Working homepage hero and entry system, integrated into the existing app. This is the first requested deliverable, not the complete site overhaul. Database APIs, section navigation, footer, donations and research content remain intact.

## Build order and source tree
1. `src/components/atmosphere/specimen-particles.ts`: pure particle spawn/update/drawing functions. Four artistic particle shapes, Brownian-like drift, bounded velocity, pointer repulsion, wraparound and delta-time handling.
2. `src/components/atmosphere/tank-hero.tsx`: Canvas2D renderer, viewport/DPR limits, cursor-velocity rings, scroll-current response; semantic native-dialog entry gate, session preference, keyboard escape, focus restoration, optional sound controls.
3. `src/components/atmosphere/audio-engine.ts`: gesture-only hydrophone oscillators and knock transient. Default silent. Visibility suspension and route-unmount disposal.
4. `src/components/atmosphere/tank.css`: scoped obsidian/cyan/glass tokens, editorial composition, mobile layout, surface-break entry animation, Lenis styles.
5. `src/components/atmosphere/smooth-current.tsx`: Lenis lifecycle. Native touch scrolling. Reduced-motion preference disables smooth scrolling.
6. `src/app/layout.tsx`: Cormorant Garamond normal/italic display font, existing Geist/Geist Mono retained. Default theme changed to dark; existing stored preference remains respected.
7. `src/app/page.tsx`: mounts smooth scrolling.
8. `src/components/sections/home-section.tsx`: replaces old Hero and removes orphan droplet decoration; retains controlled ZIP search and navigation callbacks.
9. `scripts/tank-check.mjs`: executable simulation assertions.

All implementation files above contain complete source, not placeholders.

## Dependencies
Added: `@studio-freight/lenis@1.0.42` via npm, updating package-lock.json. This exact package was explicitly requested, but npm marks it deprecated in favor of `lenis`. Migration recommended before a later major release.

Reused: Next.js, React, TypeScript, Tailwind v4, next/font and existing Framer Motion elsewhere in the app. No WebGL, Three.js or GSAP dependency added for this Canvas2D foundation. Cormorant Garamond provides the open-license editorial-serif direction without proprietary font files.

## Run and verify (repository root)
```
npm run build
node node_modules/next/dist/bin/next start -p 3010
node scripts/tank-check.mjs
npx eslint src/components/atmosphere
npx tsc --noEmit
```
Existing `npm start` uses POSIX inline NODE_ENV assignment and fails under Windows npm's cmd shell. Direct Next invocation above is the verified alternative.

## Verification observed
- Production build completed and homepage returned HTTP 200.
- Atmosphere ESLint passed.
- Particle assertions passed: zero delta, 360,000 finite bounded updates, repulsion. Source lifecycle guard checks audio disposal is present; it is not an audio quality test.
- Browser: enter transition, skip/Escape, heading focus, sound pressed state, returning-session bypass, reduced-motion final meter at 14.8%, Lenis activation, donation deep-link iframe.
- Desktop 1440x1000 and mobile 390x844 screenshots inspected. No horizontal page overflow at either width.
- No uncaught JavaScript errors reported by browser errors command during tested flows.
- Audio button state verified; acoustic output has not been listened to.
- Actual 60 FPS on physical mobile hardware is NOT verified. Particle budget is 70 mobile / 180 desktop, DPR capped at 1.5. Reduced motion is static; rendering work skips hidden/offscreen states.

## Existing blockers, not concealed
- Full TypeScript check reports 17 pre-existing errors in API/chart/admin/map files. No new TypeScript errors appeared. Existing next.config.ts has ignoreBuildErrors=true, so build success is not a clean repository typecheck.
- Local DATABASE_URL uses `file:` while Prisma schema expects PostgreSQL; DIRECT_URL is not supplied by checked local env files. No local PostgreSQL service, psql or Docker executable detected. No credentials or schema changed.
- Database-backed search success and search-error toast could not be verified locally. Search interaction was attempted; waiting for its error toast timed out. Donation navigation and iframe presence were verified, not a financial transaction.
- npm install reported 10 dependency vulnerabilities (4 moderate, 6 high). No blind audit fix was run.
- Port 3000 served a stale Next process; current QA ran against fresh port 3010.

## Scientific boundaries
The entry purity percentages and particle field are explicitly theatrical, not water tests or sample data. Polymer-colored shapes are illustrations, not chemically identified samples. No 240,000-particle ingestion or human disease claim was introduced. Before narrative stages, cite the bottled-water study accurately, distinguish micro/nanoplastics and sample averages from universal exposure, and avoid portraying unsettled health outcomes as established causation.

## Subsequent implementation sequence
1. Restyle shared header/footer and remaining data sections without breaking workflows.
2. Add GSAP ScrollTrigger narrative stages and scoped cleanup; synchronize Lenis and ScrollTrigger.
3. Build inspectable bottle with macro/UV visualization explicitly labeled illustrative.
4. Add optional inertial/magnetic cursor and typography refraction with keyboard/touch fallbacks.
5. Verify citations, real database search using an authorized development PostgreSQL DSN, nested modal scrolling, performance on hardware, and accessibility.
6. Commit further verified stages, then explicitly deploy. This foundation has not been pushed or deployed.

Not implemented in this first deliverable: true fluid solver/GLSL refraction, 3D specimen, four narrative stages, magnetic custom cursor, full site reskin. Current fluid effects are lightweight Canvas2D rings and particle impulses, not a physically accurate fluid simulation.
