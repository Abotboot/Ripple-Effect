# Human Aquastructure: foundation and narrative stages 01-04

## Acceptance gate
- `scripts/acceptance.cjs` is the single green gate for the redesign: WebGL bottle confirmed (not 2D fallback), UV + rotation pixel changes, and editorial-page styling asserted on about/faq/sources/partners/map/microplastics/reports/donate/privacy/terms, zero page errors, no mobile overflow. Run: `PLAYWRIGHT_MODULE=C:/Users/ayada/AppData/Local/Temp/ripple-browser-qa/node_modules/playwright node scripts/acceptance.cjs` against `next start -p 3020`.

## Upstream integration and WebGL bottle
- Local branch `local/aquastructure-integrated` merges 21 upstream commits (new logo/favicon, 3D drop hero, security rate-limiting, HCB sync, legal pages, fake-data removal) into the local redesign. Two conflicts resolved: home hero keeps TankHero, header combines tank chrome with upstream scroll-progress bar. Merge commit 89dc2dd; verify script still passes.
- Bottle rebuilt as on-demand WebGL (src/components/atmosphere/bottle-scene.ts): transmission PET lathe, water volume, ribs, threaded cap, canvas-texture label, UV particle layer and wireframe mode; renders only on view change; falls back to the Canvas2D drawing if WebGL init fails. Label rotation, exposure, light intensities and clear-PET material tuned after screenshot review (bottle-v2.png). specimen-check.cjs passed against the production build (added explicit scrollIntoView before render).
- Second batch (defee5a): tank-system.css tokens for dark theme incl. dialogs, home-data/legal-page/admin-workbench wrappers, fixed three setState-in-effect lint errors (dialog reset now event-driven via onOpenChange, HCB sync and pending-search deferred to timer callbacks). Targeted ESLint zero errors, build passes.
- Full local regression suite passed on prod server 3020: specimen, info-reskin (about/faq/sources/partners), submit workbench, rest-reskin (map/microplastics/reports/donate + HCB URL/iframe), tank particle/audio checks. Reviewed final home/map desktop screenshots. Zero page errors in browser console during home/map capture.
- Still local-only per user instruction: no push to GitHub, no deploy. Database remains blocked for real data (local .env file: URL vs PostgreSQL requirement); map zeros are fallbacks, not measurements.

## Map, Microplastics, Reports and Donate styling
- Extended scoped editorial styling to four public sections. Reduced Map heading scale and aligned its description; wrapped Reports filters after measuring overflow at 320px. Report controls retain their handlers and now use full-width, 44px-minimum sizing.
- Removed Donate's legacy Ripple wrapper and continuous decorative orbs, droplets and wave. HCB iframe, external donation URL and funding-fetch logic retained. No payment attempted.
- Production build passed; targeted ESLint reported zero errors and one unused-disable warning. Build still skips type checks. rest-reskin-check.cjs passed four route headings, fonts, dark surfaces, 320/375/768px wrapper bounds, HCB URL/actionability and report input. info-reskin-check.cjs and tank-check.mjs also passed against production port 3020. Reviewed production mobile Donate/Reports and desktop Map screenshots under C:/Users/ayada/AppData/Local/Temp/rest-*.png.
- Separately captured actual browser /api/stats response: HTTP 500, empty body. Server log confirms Prisma rejects DATABASE_URL's protocol before statistics queries, inside ensureSeeded's account upsert. Map's existing catch leaves stats null and zero-count fallbacks appear; these are not real zero measurements. No database/config/schema changes made. Real search, populated maps and submission remain unverified.
- Not deployed. Admin and final integration remain outside this batch. This is visual consistency work, not a claim of full reference-site fidelity or completed overhaul.

## Informational-page shared styling
- About, FAQ, Sources and Partners now share scoped obsidian surfaces, editorial display headings, mono badges, responsive typography and keyboard outlines. Existing content and API calls retained. This is a styling pass, not completion of the full architectural redesign.
- Removed the source-title stretched-link overlay after the browser test showed it intercepted the separate external-link control.
- Production build passed; targeted ESLint reported zero errors and two unused-disable warnings. Build still skips type validation. info-reskin-check.cjs passed all four hash routes, 320/375/768px wrapper bounds, FAQ search/keyboard accordion, light-theme FAQ heading, source-link actionability and partner Contact navigation. Submission regression and tank particle/audio checks also passed.
- Reviewed desktop Sources/Partners and mobile About/FAQ screenshots in C:/Users/ayada/AppData/Local/Temp/info-*.png. Preview reused port 3020; restart the actual listener after builds to avoid stale chunks. Test waits for route-specific headings because hash navigation hydrates after the initial home render.
- Database integration remains unverified due to the existing local SQLite URL/PostgreSQL schema mismatch. No credentials, schema or deployment changed. Direct verification only; no independent review.

## Submission unit-update correction
- Removed the synchronous state-setting effect; contaminant selection now updates the selected ID and default unit together in its event handler. Other form fields and manual unit edits remain intact.
- Reproduced the original ESLint error before editing. Targeted ESLint and production build now pass (build still skips types).
- Production preview at port 3020 passed reading-unit-check.cjs with explicit intercepted test fixtures for legal-unit precedence, guideline fallback and ppb default. This is a UI test, not evidence of database functionality. Existing submit-reskin-check.cjs also passed; neither test sent a submission.
- Local DATABASE_URL uses file: while Prisma requires PostgreSQL. Credentials/schema unchanged. Automatic account creation in ensureSeeded means switching databases requires care; end-to-end data validation remains blocked. No new informational-page styles were applied in this batch.

## Submission-page reskin
- Replaced bright hero and rounded surfaces with a scoped obsidian reading workbench, editorial headings, mono labels and full-width 44px-minimum controls. Removed decorative hero blobs. Form state, field IDs, validation, submit handler and API calls unchanged.
- Production preview http://localhost:3019/#submit passed scripts/submit-reskin-check.cjs with the QA-only PLAYWRIGHT_MODULE override: ten fields retained, empty-form validity, keyboard input, treatment selection, 320/375/768px control bounds and light-theme field contrast. Zero POST requests sent; this is not an end-to-end submission test.
- Production build and diff checks passed. Targeted ESLint reports one pre-existing react-hooks/set-state-in-effect error in the auto-unit effect, independently reproduced against HEAD via eslint stdin; not altered in this styling batch. Build skips type checks. Database blocker remains.
- Desktop/mobile screenshots reviewed: C:/Users/ayada/AppData/Local/Temp/reading-desktop.png and reading-mobile.png. Direct verification only, not deployed. Other inner pages and final integration remain unfinished.

## Shared header and footer reskin
- Shared obsidian shell, editorial brand wordmark, monospaced navigation, cyan active-route indicators and editorial footer. Navigation/contact/export destinations retained. Inner-page content is not yet reskinned.
- Removed nested button from GitHub link. Menu has an accessible name, controls association, current-page state, Escape close/focus return and bounded viewport scrolling. Navigation respects reduced motion.
- Production preview http://localhost:3018 passed `scripts/chrome-reskin-check.cjs` using the QA-only PLAYWRIGHT_MODULE override documented below: computed tokens, keyboard focus, desktop navigation, mobile gate/menu/Escape, footer content bounds at 320/375/768px and chrome light-theme colors.
- Header/footer ESLint, build, cursor/refraction regressions, particle/audio checks and whitespace checks passed. Build skips type checking. Desktop header, footer and mobile menu screenshots reviewed under C:/Users/ayada/AppData/Local/Temp/reskin-*.png.
- Direct verification only. No deployment; database blocker and inner-page reskin remain.

## Magnetic fluid cursor
- Added FluidCursor once in page.tsx: fine-pointer mouse overlay with time-based easing and bounded attraction toward hovered links/buttons. Native cursor and hit areas remain unchanged. No added production dependency.
- Animation frames stop after settling. Overlay hides on keyboard input, scrolling, resize, blur, visibility and hash changes, and over fields/dialogs. Media-query listener handles reduced-motion changes in both directions; touch does not mount the overlay.
- Initial acceptance failed because the cursor was missing. Updated test checks rendered geometry rather than unitless CSS values and scrolls the target into view before attraction assertions.
- Final build at http://localhost:3017 passed cursor acceptance, specimen and refraction browser regressions, Stage 04 HTTP smoke, atmosphere lint, particle/audio checks and whitespace checks. Full legacy pinned-narrative suite not rerun in this batch. Build skips type validation; existing database blocker remains.
- Run `scripts/cursor-check.cjs` with the QA-only PLAYWRIGHT_MODULE override documented below and QA_URL=http://localhost:3017. Screenshot reviewed: C:/Users/ayada/AppData/Local/Temp/fluid-cursor-desktop.png.
- Direct verification only, no independent review or deployment. Site-wide reskin and final integration/deployment remain unfinished.

## Stage 04 label refraction
- Added a static SVG displacement filter to the primary CTA label only. Native cursor, link hit area and navigation remain unchanged; this is not the planned inertial/magnetic cursor.
- Effect applies only on fine-pointer hover with normal motion, never on keyboard focus, touch or reduced motion. No event handlers, animation loop or dependency added.
- Test first failed with `Refraction label missing`. Production build at port 3016 passed `scripts/refraction-check.cjs`: hover pixels change, leave resets, keyboard focus remains crisp, Enter opens the form, reduced-motion and touch disable the filter.
- Run with the same QA-only `PLAYWRIGHT_MODULE` override documented below and `QA_URL=http://localhost:3016`. Atmosphere lint, production build and whitespace checks passed. Build skips types. Direct review only; not deployed.

## Specimen inspector
- Added `specimen-inspector.tsx` and `.css` between the stats bar and narrative. Canvas2D pseudo-3D bottle, Macro/UV buttons, native keyboard/touch rotation slider. No production dependencies added.
- Canvas redraws only on mode, angle or size changes. ResizeObserver disconnects on cleanup; no perpetual animation loop. Reduced motion remains static except for explicit controls. DPR capped at 2.
- UV fragments, scale and distribution are explicitly illustrative. Study figures are labeled study averages, not measurements of this bottle, spectrometry results or shedding rates.
- Production build and atmosphere ESLint passed. Fresh headless Chrome/Playwright at port 3015 verified actual UV click changes pixels and readouts, keyboard rotation changes pixels, mobile content bounds, reduced-motion static canvas, Macro restoration and CTA route unmount. Particle/audio checks passed. Full legacy narrative animation scripts were not rerun for this batch after agent-browser viewport commands began returning EOF.
- Regression: `PLAYWRIGHT_MODULE=C:/Users/ayada/AppData/Local/Temp/ripple-browser-qa/node_modules/playwright QA_URL=http://localhost:3015 node scripts/specimen-check.cjs`. The optional module override points to a temporary QA-only install; without it the script expects `playwright` available through normal Node resolution. Chrome channel must be installed.
- Reviewed `C:/Users/ayada/AppData/Local/Temp/specimen-uv-desktop.png` and `C:/Users/ayada/AppData/Local/Temp/specimen-uv-mobile.png`. Element screenshots include existing fixed navigation overlays; mobile DOM bounds were checked separately.
- Direct verification only. No deployment, independent review or clean TypeScript claim. Remaining: magnetic/refraction cursor, site-wide reskin and deployment; database configuration blocker unchanged.

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
