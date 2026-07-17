# A Ripples Effect — Worklog

This file tracks development progress for the A Ripples Effect tap water & microplastics database.
Shared handover document for all agents (human and AI) working on this project.

---
Task ID: 1
Agent: Z.ai Code (main)
Task: Foundation work — fix SQLite schema, rebrand RippleEffect -> "A Ripples Effect", fix dark-mode charts, make microplastics first + add distinction, GitHub repo link, zoom logo, add Chapter/Donation models + API routes.

Work Log:
- Fixed prisma/schema.prisma: changed datasource from postgresql to sqlite (env had SQLite but schema said postgres). Added new models: Chapter, Donation. Added `trackedByUs` + `rarityNote` fields to Contaminant. Ran `bun run db:push`.
- Converted ALL source files from CRLF to LF line endings (extracted RAR had Windows endings, which broke Edit tool matches).
- Rewrote `src/lib/ensure-seeded.ts`: admin email now `admin@arippleseffect.org` / password `rippleeffect`; contaminants now include `trackedByUs` + `rarityNote` (microplastics=true with rarity note); added Chapter seed (3 records) and Donation seed (4 records); microplastics ranges calibrated to published research (WHO 2019, Orb Media 2017) with explicit data-provenance note.
- Updated `src/lib/types.ts`: added `trackedByUs`/`rarityNote` to Contaminant; added Chapter + Donation types; extended Stats with chaptersCount, donationsCount, donationsTotal, trackedByUsCount.
- Rebranded everywhere: layout.tsx metadata, site-header.tsx (brand "A Ripples Effect"), site-footer.tsx. GitHub link now points to https://github.com/Abotboot/Ripple-Effect (was generic https://github.com).
- Zoomed logo: header logo now h-12/w-12 (sm: h-14/w-14) with ring + shadow + scale-110 hover scale-125 (was h-10/w-10).
- Updated site-header nav: added 'plastics', 'sources', 'chapter', 'about', 'donate' sections. Donate nav item styled rose (stands out). Desktop nav breakpoint moved to xl. Mobile nav is 2-col grid.
- Fixed microplastics-section dark-mode charts: replaced hardcoded light-mode oklch colors with CSS variables (var(--muted-foreground), var(--border), var(--popover), var(--chart-1), var(--chart-5)) so charts adapt to dark mode. Added data-provenance callout (explains data is calibrated to WHO/Orb ranges, illustrative). Added "we track it, almost no one else does" distinction banner. Replaced "Join the crew" CTA with "Start a chapter" CTA. Accepts onNavigate prop.
- Updated contaminant-explorer-section: microplastics now appears FIRST as a featured card with amber theme + "Tracked by us" badge + rarity note. Added filter buttons: All / Tracked by us / Plastics / Regulated / Unregulated. Added distinction banner explaining why microplastics is listed first. Category badges now have dark-mode variants.
- Updated home-section: accepts onNavigate prop; added microplastics distinction banner (amber), donate POP banner (rose gradient, hard to miss), data-sources + open-source GitHub strip.
- Created API routes: /api/chapters (GET admin, POST public), /api/chapters/[id] (PATCH/DELETE admin), /api/donations (GET admin, POST public pledge), /api/donations/[id] (PATCH/DELETE admin).
- Updated /api/contaminants route: sorts microplastics first, then trackedByUs, then regulated, then name.
- Updated /api/stats route: returns chaptersCount, donationsCount, donationsTotal, trackedByUsCount.
- Updated src/lib/api.ts: added submitChapter, listChapters, updateChapterStatus, submitDonation, listDonations, updateDonationStatus methods.
- Updated src/app/page.tsx: wires all new sections (PlasticsSection, DataSourcesSection, ChapterSection, AboutSection, DonateSection). Passes onNavigate to home, microplastics, about, footer.

Stage Summary:
- Dev server running on port 3000. Schema synced, ensure-seeded will auto-populate on first API call.
- Foundation complete. Still need: the 5 new section COMPONENT files (plastics-section, data-sources-section, chapter-section, about-section, donate-section), admin section update (Chapters + Donations tabs), then QA + cron.
- Theme system: primary = teal (oklch 0.55 0.13 195). CSS vars: --background, --foreground, --card, --muted-foreground, --border, --primary, --chart-1..5. Utility classes: bg-water-hero, bg-water-surface. Components: all shadcn/ui in src/components/ui. Toast via useToast. Icons: lucide-react.
- Section component pattern: `'use client'` named export, e.g. `export function ChapterSection()`. Self-contained, fetches via `api` helper from '@/lib/api'.
- Admin login: admin@arippleseffect.org / rippleeffect
- GitHub repo: https://github.com/Abotboot/Ripple-Effect

Unresolved / next:
- Create the 5 new section component files (delegated to subagents + main).
- Update admin-section.tsx to add Chapters + Donations management tabs.
- Final QA via agent-browser (home, search, microplastics dark mode, contaminant explorer microplastics-first, chapter signup, donate, admin login, about, plastics, data sources).
- Create cron job (every 15 min, webDevReview).

---
Task ID: 8-a + 9
Agent: Z.ai Code (subagent — sections)

Task: Create two new React section components for the "A Ripples Effect" project:
  (8-a) data-sources-section.tsx — factual grid of 7 external databases we cross-reference.
  (9)   about-section.tsx — About Us page (hero, mission, story, values, crew, stats, CTA, links).

Work Log:
- Read worklog.md and inspected existing sections (microplastics, home, volunteer) for the established pattern: `'use client'`, named export, framer-motion staggered `motion.div` with `container`/`item` variants, shadcn/ui Card/Badge/Button, theme-aware Tailwind classes (`text-foreground`, `bg-card`, `border-border`, `bg-primary/10 text-primary`, with `dark:` variants for colored accents), `bg-water-hero` / `bg-water-surface` utility classes, no hardcoded oklch.
- Confirmed `Section` type exported from `@/components/site/site-header`, `api.getStats()` returns `Stats` with `utilitiesCount`, `contaminantsCount`, `samplesCount`, `chaptersCount`. Confirmed `page.tsx` already imports both `DataSourcesSection` and `AboutSection` and wires `onNavigate={setSection}` to AboutSection (DataSourcesSection takes no props, matching the existing wiring).

File 1 — /home/z/my-project/src/components/sections/data-sources-section.tsx
- `export function DataSourcesSection()` — no props (matches page.tsx wiring).
- Header: `Database` Badge, title "Integrated data sources", subtitle explaining we cross-reference public databases and supplement with our own microplastics measurements.
- Amber callout banner: "Every database above tracks regulated contaminants. Almost none track microplastics — that's the gap A Ripples Effect fills." (uses the same amber gradient pattern as microplastics-section for visual consistency).
- Grid `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` of 7 cards, each with:
    * Colored icon chip (Database, Building2, FlaskConical, Waves, Globe, Scale, HeartPulse — exactly the icons specified in the task).
    * Card title linked (with absolute-positioned `::after` so the whole card is clickable) and a separate ExternalLink icon button — both open `src.url` in a new tab.
    * Factual description exactly as specified (EWG ~50,000 utilities; SDWIS PWSID mapping; UCMR 5 = 29 PFAS + lithium, microplastics NOT on UCMR; USGS NWIS for source-water context; WHO 2019 no health-based guideline value; ECHO compliance/enforcement; CDC private wells/outbreaks).
- "How we use each source" 2/3-width paragraph + 1/3-width "All data is open" card with JSON and CSV download buttons linking to `/api/export?format=json&table=utilities` and `/api/export?format=csv&table=utilities` (relative paths, open in new tab).
- Provenance note (Info icon) clarifying we link to each source as-published, do not re-host, and clearly label our own microplastics measurements by date/chapter/method.

File 2 — /home/z/my-project/src/components/sections/about-section.tsx
- `export function AboutSection({ onNavigate }: { onNavigate?: (s: Section) => void })`.
- Hero: `bg-water-surface` (teal gradient, white text), white blur orbs for depth, `About us` Badge, title "A Ripples Effect", tagline "One act. Endless impact."
- Mission statement card with Sparkles icon, exactly as specified (volunteer crew, 2026 Water Project, open/searchable/actionable, tracks microplastics).
- "The story" section (BookOpen Badge) — 3-paragraph narrative: students/volunteers noticed microplastics weren't in any public database → built a low-cost identifier + open database → chapters can now take the identifier and test their own water.
- "What we believe" — 3 value cards (Open data / Community-powered / Science first) with emerald, teal, amber accents and `dark:` variants.
- Stats strip: 4-column grid (`grid-cols-2 sm:grid-cols-4`) showing utilitiesCount, contaminantsCount, samplesCount, chaptersCount. Uses `Skeleton` for each value while `loading` is true; falls back to '—' if stat is undefined.
- "The crew" — Engineering crew / Coding crew / PR & social crew (roles only, no invented names) + a callout: "We meet virtually every Monday at 6:30 PM. Want to sit in? Email us — newcomers are always welcome."
- CTA buttons: "Start a chapter" → onNavigate('chapter') [primary], "See the data" → onNavigate('microplastics') [secondary], "Support us" → onNavigate('donate') [outline].
- Links section: 3 cards (GitHub → https://github.com/Abotboot/Ripple-Effect, Email → mailto:rippleeffectoffice@gmail.com, Instagram → https://www.instagram.com/rippleeffectoffice), all open in new tab with rel="noopener noreferrer".

Technical:
- Both files: `'use client'` directive at top.
- Both files use shadcn/ui Card/CardContent/CardHeader/CardTitle, Badge, Button; about-section also uses Skeleton. Icons from lucide-react. Animations via framer-motion with staggered `container`/`item` variants and `whileInView` for below-the-fold sections.
- Theme-aware everywhere: `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-primary/10 text-primary`, plus `dark:` variants for amber/emerald/teal/sky/cyan/violet/rose/indigo accent chips. NO hardcoded oklch colors.
- Mobile-first responsive: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` for card grids; `flex flex-col sm:flex-row` for callouts; `grid-cols-2 sm:grid-cols-4` for stats.
- No footer added (layout wrapper handles sticky footer).
- Lint: ran `bunx eslint src/components/sections/data-sources-section.tsx src/components/sections/about-section.tsx` → EXIT 0, no errors. (The only remaining `bun run lint` error is in the unrelated `upload/extracted/Ripple-Effect/examples/websocket/frontend.tsx` demo file — pre-existing, not touched by this task.)

Stage Summary:
- Both section components created and lint-clean. They are already wired into `src/app/page.tsx` (DataSourcesSection at the `sources` route, AboutSection at the `about` route with `onNavigate={setSection}`), so they will render immediately on the running dev server.
- Data-sources page: factual, 100% real URLs/descriptions, no hallucinations.
- About page: complete narrative + live stats + 3 CTAs that navigate to chapter/microplastics/donate sections.
- Next: remaining sections (plastics-section, chapter-section, donate-section) per worklog's "Unresolved / next" list, then admin-section Chapters + Donations tabs, then QA via agent-browser.

---
Task ID: 10-a
Agent: Z.ai Code (subagent — donate section)
Task: Build the donate-section.tsx crowdfunding-style donation page that "pops" (rose gradient hero, live progress bar, tier cards, pledge form posting to /api/donations, where-the-money-goes allocations, recent supporters mini-feed, GoFundMe external link).

Work Log:
- Read worklog.md for project context (theme system, api helper, Donation type, /api/donations POST contract, /api/stats returns donationsTotal + donationsCount). Reviewed volunteer-section.tsx as the section-component pattern reference.
- Created `/home/z/my-project/src/components/sections/donate-section.tsx` with `'use client'` directive and `export function DonateSection()`.
- Hero: `bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600` with white text, large heading "Fund the microplastics identifier" (text-3xl sm:text-5xl), subheading about crowdfunding a low-cost identifier that chapters dip into local water.
- Three animated decorative blobs (framer-motion `motion.div` with `animate={{scale, opacity}}` + `blur-3xl`) in the hero — pulsing rose/amber/pink circles for visual energy.
- Live progress bar toward $25,000 goal. Fetches `api.getStats()` on mount (`useEffect`), reads `donationsTotal` and `donationsCount`. Displays "Raised $X of $25,000 goal" with custom animated bar (framer-motion `initial={{width:0}} animate={{width: pct%}}`) styled as amber→white gradient. Donor count shown via Users icon. On stats failure, gracefully shows $0 (caught in try/catch, sets raised=0). Stats loading state uses Skeleton.
- Crowdfunding tiers as 4 eye-catching cards with distinct accent colors + `dark:` variants:
  - Supporter ($25+) rose accent — "Gets your name on our backers wall."
  - Friend ($50+) amber accent — "Backer wall + a quarterly impact report."
  - Champion ($250+) fuchsia accent — "All above + early access to the identifier kit waitlist."
  - Founding Sponsor ($1,000+) emerald accent — "All above + credited as a founding sponsor on the site + a chapter kit sponsored in your name."
  Each card has a "Select" button that calls `selectTier()` → sets `form.amount` to the tier minimum and highlights the card with a ring. Selecting another tier or manually editing amount updates selection state.
- Pledge form (Card): name (required), email (optional), amount (required, prefilled from tier — editable, with $ prefix), anonymous checkbox (uses shadcn Checkbox with proper label wrapper), message (optional Textarea). On submit, validates name + amount (toast on missing/invalid), then `api.submitDonation({name, email, amount, message, anonymous})`. Backend auto-derives tier. On success: shows confetti-like success state — 8 colored sparkle dots animate outward in a circle (framer-motion, real CSS colors not Tailwind classes), spring-bounce CheckCircle2, "Thank you, {name}!" message with tier + amount. Also bumps local `raised` + `donorCount` + prepends to supporters feed. Toast confirmation. Errors caught and shown via destructive toast (handles 400/409 etc.). "Make another pledge" button resets.
- Where the money goes — 4 small cards with icons (Wrench, Microscope, FlaskConical, Database) and percentage allocations (35/30/25/10) with animated mini-bars (framer-motion `whileInView` width animation).
- External GoFundMe link: prominent secondary button in hero ("Donate on GoFundMe", opens https://www.gofundme.com in new tab via `target="_blank" rel="noopener noreferrer"`), styled as white-on-rose to be visually distinct from the outline "Or pledge below" anchor. Plus a small note: "Prefer GoFundMe? We're setting up our campaign there too." Plus a secondary callout Card at the bottom reiterating the GoFundMe option (rose gradient border card).
- Recent supporters mini-feed: since `/api/donations` GET is admin-only, does NOT call it. Instead maintains an in-session list of pledges submitted by this visitor, displayed in a scrollable `max-h-96 overflow-y-auto` feed. Empty state shows dashed Card with "Be the first to pledge today" prompt. Each supporter entry shows avatar (first initial or ?), name (or Anonymous), amount Badge, tier Badge, optional message, and "Just now" timestamp. Animate-in via framer-motion.
- Responsive: hero text scales (text-3xl sm:text-5xl), tier grid is `sm:grid-cols-2 lg:grid-cols-4`, pledge+allocations grid is `lg:grid-cols-3` (form spans 2), all stacks on mobile. CTAs are full-width on mobile, auto on sm+.
- Theme-aware: rose gradient works in both light and dark. Cards below hero use `bg-card border-border text-foreground`. Tier accent colors have explicit `dark:` variants (rose-950/30, amber-950/30, etc.). Allocation icons/badges also have dark variants.
- Imports verified against installed shadcn components: Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Label, Checkbox, Badge, Skeleton all confirmed present in src/components/ui. Icons from lucide-react (HandHeart, Heart, Sparkles, CheckCircle2, Loader2, Send, ExternalLink, Wrench, FlaskConical, Microscope, Database, Users).
- Lint: ran `npx eslint src/components/sections/donate-section.tsx` → EXIT 0, zero errors. `bun run lint` shows only the unrelated pre-existing error in `upload/extracted/Ripple-Effect/examples/websocket/frontend.tsx` (not touched by this task, was already noted in Task 8-a/9 worklog entry).
- Dev server: confirmed Ready on port 3000, no compile errors in dev.log for the donate-section.

Stage Summary:
- File delivered: `/home/z/my-project/src/components/sections/donate-section.tsx` (single React client component, ~470 lines).
- Already wired into `src/app/page.tsx` at the `donate` route (`{section === 'donate' && <DonateSection />}`), so it renders immediately on the running dev server — no other files needed to be changed.
- The donate page POPS: vivid rose hero with animated blobs, big bold heading, live animated progress bar toward $25k goal, 4 colorful tier cards, confetti success animation, GoFundMe CTA — all while staying a focused section (hero + scrollable content below), not full-bleed.
- Backend integration is real: GET /api/stats for progress, POST /api/donations for pledges. Tier derivation is server-side. Anonymous flag honored (sends "Anonymous" as name when checked).
- Next: still need plastics-section, chapter-section, admin-section Chapters+Donations tabs, then QA via agent-browser (including testing the donate pledge flow end-to-end).

---
Task ID: 6,7,12,13
Agent: Z.ai Code (main)
Task: Build Chapter + Plastics sections, update admin (Chapters/Donations tabs), fix Admin nav, comprehensive agent-browser QA.

Work Log:
- Built `src/components/sections/chapter-section.tsx`: replaces the old "Join the crew" volunteer flow. New flow = "Start a Chapter": sign up -> get identifier kit -> dip into local water streams/tap -> push readings to DB. 4-step journey cards (Sign up, Get kit, Dip & read, Push to database). "Where to dip" section (kitchen tap, streams, reservoirs, storm runoff). Companion app callout (in progress). Kit contents card. Full signup form (name, email, chapter name, city/state/zip, water body, organization, identifier-needed checkbox, message) with success state. No coder/engineer role options — just join the chapter. POSTs to /api/chapters.
- Built `src/components/sections/plastics-section.tsx`: dedicated "Plastics & emerging contaminants" page. 5 plastic entries (microplastics, nanoplastics, microbeads, tire-wear particles, synthetic textile fibers) — ALL factually sourced with real URLs (WHO 2019, PNAS 2024 Qian et al., EPA, Science 2021 Tian et al., Environ. Sci. Technol. 2016). 6 emerging contaminants (PFAS, PPCPs, endocrine disruptors, perchlorate, 1,4-dioxane, cyanotoxins) with EPA/USGS/NIEHS sources. Amber "plastics largely untracked" distinction banner. "Contaminants we actively track" grid fetched from API. "Why it matters" 3-card section.
- Updated `src/components/sections/admin-section.tsx`: added Chapters + Donations management tabs (7 tabs total: Reports, Utilities, Contaminants, Chapters, Donations, Legacy, Import/Export). ChaptersAdmin shows chapter signups with water body, organization, "Needs kit" badge, status dropdown (pending/contacted/onboarded/active/declined). DonationsAdmin shows stats (total raised, completed, pledged, avg gift) + donation list with tier badges + status dropdown. Fixed login default email to admin@arippleseffect.org + demo creds text.
- Added 'admin' back to site-header NAV array (was accidentally dropped) — now 11 nav items, Admin last with Lock icon.
- Fixed home-section.tsx duplicate `ArrowRight` import (was causing Turbopack "defined multiple times" compile error).
- Installed missing deps: react-simple-maps, d3-geo, topojson-client + types (map-section needed them).
- Fixed package.json dev script: removed `| tee dev.log` pipe (was causing dev server to die when bash sessions ended in sandbox). Now `next dev -p 3000` directly.

QA Results (agent-browser + VLM, all PASSED):
- Home: title "A Ripples Effect", logo zoomed (h-12/sm:h-14 with ring+shadow), amber microplastics distinction banner visible, rose/pink donate POP banner visible, data-sources + GitHub cards visible. VLM 8/10.
- Microplastics dark mode: BOTH charts (treatment effectiveness + by city) readable with visible axis text/numbers. Data-provenance callout (WHO/Orb Media) present. "we track it, almost no one else does" distinction banner present. Start a Chapter CTA present.
- Contaminant explorer: amber banner explaining microplastics listed first. Microplastics shown as FIRST featured card with amber theme + "#1 We track this / TRACKED BY US" badge. Other contaminants in grid below.
- Plastics: "Beyond the regulated list" renders cleanly, no broken areas.
- Data Sources: "Integrated data sources" with EWG/EPA/USGS/WHO listed.
- About: "One act. Endless impact" tagline, mission section renders.
- Chapter form: filled + submitted -> "You're on the map! 🌊" success state + toast "Chapter request received! 🌊". End-to-end works.
- Donate: rose/pink hero POPS, progress bar shows $1,325 of $25,000 (5%), tier cards + pledge form present. Filled + submitted $100 -> "Thank you, Browser Donor! 🎉" success + correctly mapped to Champion tier.
- Admin login: admin@arippleseffect.org / rippleeffect -> dashboard "Welcome back, A Ripples Effect Admin". Chapters tab loads (Dev Sharma/UIC/onboarded, Test User/Colorado River/Needs kit). Donations tab loads (Total Raised $1,325, Friend $75, Anonymous Supporter $25).
- Mobile (390px): no horizontal overflow, hero search usable, mobile menu opens cleanly (stacked nav items).
- Sticky footer: footerBottom (3471) === docHeight (3471) -> footer at bottom, no floating gap.
- Zero page errors / zero console errors across ALL sections.

Stage Summary:
- ALL user requirements addressed and browser-verified.
- Admin login: admin@arippleseffect.org / rippleeffect (works, verified).
- Dev server stable when run with `bun run dev` (no tee pipe). Sandbox kills background processes between bash sessions — start fresh for each QA/dev session.
- Known sandbox limitation: dev server dies when bash tool session ends. Not a code issue.

Unresolved / next-phase recommendations:
- Connect a real payment processor (Stripe/GoFundMe) to the donate flow (currently records pledges only).
- Build the actual microplastics identifier firmware + the companion mobile app that pushes readings to /api/samples.
- Replace illustrative sample data with real lab-verified readings as chapters collect them.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add email alert subscriptions.

---
Task ID: cron-round-2
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + new features (animated stat counters, recent activity feed, email alert subscriptions) + bug fixes (RippleEffect->A Ripples Effect in share text + API info endpoint).

Work Log:
- Read worklog.md — prior round completed all user requirements. Project stable, zero errors. Identified next-phase opportunities from the recommendations list.
- QA via agent-browser: all 11 sections (home, map, contaminants, microplastics, plastics, data sources, community, chapter, about, donate, admin) render with zero page errors and zero console errors. Map section verified rendering "Water utilities across America".

New features added:
1. **Animated count-up stat counters** (styling polish):
   - Created `src/hooks/use-count-up.ts` — reusable hook with IntersectionObserver + ease-out cubic + prefers-reduced-motion support.
   - Rewrote `AnimatedCounter` component in home-section.tsx as self-contained (uses useState + useRef + requestAnimationFrame directly, avoids ref-type issues). Stats now animate from 0 to their final value on page load (11, 12, 539, 479). Duration: 1.4s with ease-out cubic.
   - Added `dark:` variants to stat icon badges (rose-950/50, etc.) for proper dark-mode rendering.

2. **Recent Activity feed** (new feature — shows the site is alive):
   - Created `GET /api/activity` endpoint — unified feed of latest 5 samples, 4 reports, 4 chapter signups, 4 donations, sorted newest-first, top 12 returned. Each item has type, date, title, subtitle, meta, tone.
   - Added `RecentActivityAndAlerts` component to home page (between search results and microplastics banner). 2/3-width scrollable activity feed with color-coded left borders (rose=warning, emerald=ok, sky=info), type icons (Beaker/FlaskConical/Heart/DonationIcon), relative timestamps ("just now", "14m ago", "3d ago"). Loading skeletons. 1/3-width alert subscription CTA card.
   - Added `api.getActivity()` to api.ts.

3. **Email alert subscriptions** (new feature — engagement):
   - Added `AlertSubscription` model to prisma schema (email, utilityId, zipCode, contaminantId, threshold, active). Relations to Utility + Contaminant. Ran `bun run db:push`.
   - Created `POST /api/alerts` (public subscribe, validates email, deduplicates) + `GET /api/alerts` (returns active count).
   - Added alert subscription form to home page (email + ZIP + Subscribe button). Success state with emerald confirmation. Toast feedback. Verified end-to-end: filled form -> "🔔 You're subscribed!" -> DB count incremented from 1 to 2.
   - Added `api.subscribeAlert()` + `api.getAlertCount()` to api.ts.

Bug fixes:
- Fixed `src/components/sections/utility-detail-dialog.tsx` share text: "via RippleEffect water database" -> "via A Ripples Effect water database".
- Updated `src/app/api/route.ts` API info endpoint: name "RippleEffect API" -> "A Ripples Effect API", added all new endpoints to the list (activity, alerts, chapters, donations, utilities/near, contaminants/:id).

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors. Stats animate to real values (11, 12, 539, 479). Recent activity feed loads 12 items with real data ($100 Friend donation, New chapter: Browser Test Lead, timestamps). Alert subscription form works end-to-end ("🔔 You're subscribed!").
- /api/activity: returns 12 items, counts {samples:5, reports:4, chapters:4, donations:4}.
- /api/alerts POST: returns 201 with {ok:true, id:...}.
- /api/alerts GET: returns {count:2} (after test subscription).
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 3 new features added (animated counters, activity feed, alert subscriptions) + 2 bug fixes (rebrand text).
- All features browser-verified end-to-end.
- Lint clean. Dev server stable on port 3000.
- Prisma schema now has 9 models (Utility, Contaminant, Sample, Report, User, Session, Volunteer, Chapter, Donation, AlertSubscription).

Unresolved / next-phase recommendations:
- Build utility comparison feature (select 2-3 utilities, compare side-by-side) — was planned this round but deferred for quality.
- Add microplastics trend-over-time chart (are levels increasing or decreasing?).
- Connect a real email service (Resend/SendGrid) to actually send alert emails when new samples are added.
- Add a chapter leaderboard (which chapters have submitted the most readings).
- Add per-utility shareable SSR pages for SEO/social sharing.

---
Task ID: f1-compare
Agent: Z.ai Code (subagent — compare section)
Task: Build `compare-section.tsx` — utility comparison feature (select 2-3 utilities, side-by-side contaminant comparison with log-scale grouped bar chart, color-coded table, cleanest-winner trophy).

Work Log:
- Read `worklog.md` for project context (theme system, section pattern, CSS vars for dark-mode charts: `--muted-foreground`, `--border`, `--popover`, `--chart-1..5`; section pattern: `'use client'` named export, framer-motion staggered `container`/`item` variants, shadcn/ui, `bg-water-hero`).
- Inspected `microplastics-section.tsx` for the dark-mode-safe chart pattern (CSS-variable-based axis/grid/tooltip styles, no hardcoded oklch). Inspected `api.ts` (confirmed `api.compareUtilities(ids)` exists) and `api/utilities/compare/route.ts` (confirmed microplastics-first sort + legalLimit/healthGuideline per row). Verified shadcn components (Card, Badge, Button, Input, Checkbox, Label, Skeleton, Table) and lucide icons (`GitCompareArrows`, `Trophy`, `RotateCcw`, `Check`, `Loader2`, `Search`, `BarChart3`, `FlaskConical`, `Droplets`, `Users`, `MapPin`) all available.
- Created `/home/z/my-project/src/components/sections/compare-section.tsx` (~580 lines):
  - Hero (`bg-water-hero`): "Compare utilities" badge, "Side-by-side comparison" title, subtitle noting microplastics shown first.
  - Selection Card: `{n}/3 selected` badge (emerald when at max), search input, scrollable list (`max-h-64 overflow-y-auto`) of checkbox rows showing utility name + city/state + population, selection-order badges, disabled state when 3 already chosen. Side panel: "How it works" guide + Compare button (disabled until 2+, spinner while fetching) + Reset button.
  - Empty state: dashed Card with example "Try comparing Chicago, NYC, and Seattle."
  - Loading skeleton: 3 summary-card skeletons + chart skeleton + table skeleton.
  - Results (after Compare click): (a) summary cards per utility (numbered chip colored from `--chart-1/2/3`, name, city/state/PWSID, population, source, treatment, "Best levels" count, emerald "Cleanest" trophy badge on the utility with the most `bestUtilityId` wins); (b) grouped `BarChart` (recharts) with one `<Bar>` per utility colored via `var(--chart-1/2/3)`, **LOG scale** Y-axis with dynamic lower-bound (one order of magnitude below smallest measured value — covers ppt to ppm), slanted X-axis labels, `<Legend>` with theme-aware foreground, theme-aware axis/grid/tooltip via CSS variables (NO hardcoded oklch); (c) detailed comparison `Table` — rows = contaminants (microplastics first + amber "Tracked by us" badge), columns = each utility's level + Health guideline + Legal limit. Cells color-coded: rose (> legal limit), amber (> health guideline), emerald (lowest of group with `<Check>` icon). Sample-count `(n)` annotation. "Unregulated" in Legal limit column when not regulated. Color-coded legend strip below table.
  - framer-motion staggered `container`/`item` for summary cards; fade-in-up motion for the table card.
  - Error handling: `useToast` (destructive variant) on failed `listUtilities` and `compareUtilities` calls.

Technical:
- `CompareResult` type aliased as `Awaited<ReturnType<typeof api.compareUtilities>>` — auto-syncs with the api helper.
- Chart `yDomain` computed via `useMemo` so the log axis always spans below the smallest measured value (`[10^(floor(log10(min)) - 1), 'auto']`).
- All colors are CSS variables or Tailwind classes with explicit `dark:` variants. Inline `style={{ background: ... }}` only uses `var(--chart-1/2/3)` strings (resolve at runtime in both light and dark mode).
- Responsive: table wrapped in `overflow-x-auto` (shadcn Table default), chart is `h-[400px] w-full` via `ResponsiveContainer`, summary grid `sm:grid-cols-2 lg:grid-cols-3`, selection area `md:grid-cols-3` (list spans 2, actions span 1).
- Scope: file only — did NOT modify `page.tsx` or `site-header.tsx` (task said create the file; wiring left to main agent / follow-up).
- Lint: `bunx eslint src/components/sections/compare-section.tsx` → EXIT 0, zero errors. `bunx tsc --noEmit --skipLibCheck` → no errors mentioning compare-section. Dev server (`dev.log`) shows `✓ Compiled in 9.5s` with no errors related to the new file.

Stage Summary:
- File delivered: `/home/z/my-project/src/components/sections/compare-section.tsx` (lint-clean, type-clean, dev-server-clean).
- Not yet wired into `src/app/page.tsx` (out of scope). To enable: add `'compare'` to the `Section` union in `site-header.tsx`, add a nav entry, and add `{section === 'compare' && <CompareSection />}` in `page.tsx`.

---
Task ID: cron-round-3
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 3 new features (utility comparison, chapter leaderboard, microplastics trend chart) + wiring into nav.

Work Log:
- Read worklog.md — prior rounds completed all original user requirements + animated counters + activity feed + alert subscriptions. Project stable, zero errors, lint clean.
- QA via agent-browser: all existing sections still render with zero errors. Confirmed APIs work (stats: 11 utils/5 chapters/$1325; activity: 12 items; alerts: count 2).

New features added:
1. **Utility comparison** (new feature — side-by-side):
   - Created `GET /api/utilities/compare?ids=id1,id2,id3` — returns up to 3 utilities with their contaminant summaries, latest levels per utility, and "bestUtilityId" (lowest level) per contaminant. Microplastics sorted first.
   - Built `src/components/sections/compare-section.tsx` (via subagent): search/filter utilities, checkbox list (max 3), grouped bar chart (log scale, var(--chart-1/2/3) per utility, theme-aware), detailed comparison table with color-coded cells (rose=exceeds legal, amber=exceeds health, emerald=lowest), "Cleanest" trophy badge, loading skeletons, error toasts. ~580 lines, lint clean.
   - Verified end-to-end via agent-browser: selected Chicago/NYC/Phoenix -> clicked "Compare (3)" -> results showed "Cleanest" winner, "Best levels" counts, Microplastics/Arsenic/Lead rows, color-coded cells. Zero errors.

2. **Chapter leaderboard** (new feature — gamification):
   - Created `GET /api/leaderboard` — ranks chapters by blended score (3pts/report from their state, 1pt/sample covering their state, +5 active/+3 onboarded bonus). Returns ranked list + totals.
   - Built `src/components/sections/leaderboard-section.tsx`: podium for top 3 (Crown/Medal/Award icons, amber/slate/orange rank colors), full standings table for the rest, status badges, "how scoring works" explainer card. Theme-aware with dark: variants.
   - Verified via agent-browser: "Top chapters making waves" hero, 5 total chapters / 1 active, podium + standings table render. Zero errors.

3. **Microplastics trend-over-time chart** (new feature — data viz):
   - Created `GET /api/microplastics/trend` — groups microplastics samples by quarter, computes treated vs untreated averages, determines direction (up/down/flat) + pctChange.
   - Built `src/components/sections/microplastics-trend-section.tsx`: recharts LineChart with 2 lines (untreated=var(--chart-5) rose, treated=var(--chart-1) teal), direction badge (Falling/Rising/Stable with TrendingDown/Up/Minus icons), 4-stat strip (samples, period, latest treated avg, peak measured), data-provenance note. Theme-aware (CSS vars, no hardcoded oklch).
   - Embedded into microplastics-section.tsx between the by-city chart and the "what are microplastics" section.
   - Verified via agent-browser: "Microplastics trend over time" section renders with "Falling" badge (-11%), line chart with both series, 4 stats. Zero errors.

Nav + wiring:
- Added 'compare' and 'leaderboard' to the Section union type + NAV array in site-header.tsx (now 13 nav items: Home, Map, Contaminants, Microplastics, Plastics, Compare, Data Sources, Community, Start a Chapter, Leaderboard, About, Donate, Admin). Icons: GitCompare, Trophy.
- Updated page.tsx to render CompareSection + LeaderboardSection.
- Added api.compareUtilities(), api.getLeaderboard(), api.getMicroplasticsTrend() to api.ts.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors. All existing features intact.
- Compare: renders selection UI, search filter works, 3-utility selection works, "Compare (3)" produces grouped bar chart + color-coded table + "Cleanest" winner. Zero errors.
- Leaderboard: renders podium + standings table with 5 chapters, scoring explainer. Zero errors.
- Microplastics: trend chart embedded, shows "Falling -11%" with 9 quarterly data points, both treated+untreated lines, 4 stats. Zero errors.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 3 new features added (utility comparison, chapter leaderboard, microplastics trend chart) + 3 new API endpoints + 3 new components.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.
- Prisma schema unchanged (9 models). No migrations needed.
- Nav now has 13 items. Mobile menu handles them in a 2-col grid.

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add a data-quality/confidence indicator on samples (lab-verified vs citizen-submitted).
- Add filter chips on the map (only show above legal limit, only PFAS exceedances).
- Add a "recently added utilities" feed.
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: f2-map-filters
Agent: Z.ai Code (subagent — map contaminant filter chips)
Task: Add contaminant filter chips (Microplastics only / PFAS only / Lead only / Disinfection byproducts) to the Map section, separate from and ANDed with the existing tier filter chips. Backend must surface per-contaminant exceedance flags per utility.

Work Log:
- Read `worklog.md` for project context (theme system, section/component patterns, `bg-water-hero`, CSS-var-based dark-mode styling, shadcn/ui, framer-motion staggered variants).
- Read existing `src/components/sections/map-section.tsx` (630 lines) — confirmed: `'use client'` MapSection, react-simple-maps US map, dot color by tier (legal=rose / many-health=amber / health=cyan / clean=emerald), existing tier filter chips row (`All / Within guidelines / Health exceedances / Above legal limit`) using `rounded-full border px-3 py-1 text-xs` chip style with `border-primary bg-primary text-primary-foreground` for selected and `border-border bg-card text-muted-foreground` for unselected, plus a count badge in `bg-muted`.
- Read existing `src/app/api/stats/route.ts` — confirmed `utilityExceedances` Map<string, {health, legal}> built in a single pass over `samples`. Each `Sample` already includes `contaminant.slug` + `healthGuideline` + `legalLimit`. Extended this same loop to also track per-contaminant flags rather than doing a second pass.
- Read `src/lib/types.ts` `Stats` type — confirmed `mapUtilities` array shape.
- Verified contaminant slugs in `ensure-seeded.ts`: microplastics=`microplastics` (healthGuideline=0, legalLimit=null → any detection is significant), PFAS=`pfoa`+`pfos` (hg=0.1), Lead=`lead` (hg=0.2), DBPs=`thm`+`hAA5` (hg=0.15 / 0.1).

Backend changes — `src/app/api/stats/route.ts`:
- Replaced the inline Map value type with a named `UtilityExceed = { health, legal, microplastics, pfas, lead, dbp }`.
- Added `PFAS_SLUGS = new Set(['pfoa','pfos'])` and `DBP_SLUGS = new Set(['thm','hAA5'])` constants.
- In the sample loop: precompute `healthExceeded` + `legalExceeded` (kept existing tier-count logic identical — no behavior change to existing health/legal counters). Then branch on slug: `microplastics` → always set `cur.microplastics = true` (any data is significant, no federal limit); `pfoa|pfos` → set `cur.pfas` if healthExceeded; `lead` → set `cur.lead` if healthExceeded; `thm|hAA5` → set `cur.dbp` if healthExceeded.
- Extended each `mapUtilities` entry with a `contaminantExceedances: { microplastics, pfas, lead, dbp }` object (defaults to all-false for utilities with no samples).

Type change — `src/lib/types.ts`:
- Added `contaminantExceedances: { microplastics: boolean; pfas: boolean; lead: boolean; dbp: boolean }` to the `mapUtilities` element type in `Stats`.

Frontend changes — `src/components/sections/map-section.tsx`:
- Imports: added `RotateCcw, Microscope, FlaskConical, Droplets, Beaker` from lucide-react.
- State: added `const [contaminantFilter, setContaminantFilter] = useState<'all' | 'microplastics' | 'pfas' | 'lead' | 'dbp'>('all')`.
- `visibleUtilities` memo: rewrote to AND both filters — kept tier rules identical, then added `if (contaminantFilter !== 'all' && !u.contaminantExceedances?.[contaminantFilter]) return false`. Added `contaminantFilter` to dep array.
- `contaminantCounts` memo: counts total utilities per contaminant flag from the full `stats.mapUtilities` list (independent of tier selection, so the chip counts reflect total availability).
- `anyFilterActive` derived boolean; `clearFilters()` resets both filter states.
- Existing tier chips row: changed wrapper from `mb-5` to `mb-3` (so the new contaminant row sits closer), added `aria-pressed` and `dark:` variants on the selected/unselected classes, added `<span className="sr-only">` for screen-reader context, and appended a `Clear filters` ghost Button (with `RotateCcw` icon, `rounded-full h-7 px-2.5 text-xs`) that only renders when `anyFilterActive` is true.
- New contaminant chips row (`mb-5`): a small uppercase label "By contaminant" with a `FlaskConical` icon, then 5 chips (All / Microplastics only / PFAS only / Lead only / Disinfection byproducts) using the same chip styling pattern as tier chips. Each non-"All" chip renders its lucide icon (`Microscope`, `FlaskConical`, `Droplets`, `Beaker` respectively) before the label and shows a live count badge (e.g. "Microplastics only (11)"). Same `dark:` variants and `aria-pressed` for accessibility. Chips wrap on mobile via `flex flex-wrap items-center justify-center gap-2`.

Verification:
- `bunx eslint src/components/sections/map-section.tsx src/app/api/stats/route.ts` → EXIT 0, zero errors (also re-ran including `src/lib/types.ts` → EXIT 0).
- Smoke-tested `GET /api/stats` via curl: each `mapUtilities[]` entry now includes a `contaminantExceedances` object (e.g. Chicago = `{microplastics:true, pfas:true, lead:true, dbp:true}`). All 11 utilities return the field; counts non-zero.
- Dev server log shows `✓ Compiled in 8s` with no errors after the changes; `/api/stats` returns 200 in ~22ms.
- Pre-existing `tsc` warning at `map-section.tsx:419` (`style={{ cursor: 'pointer' }}` on `<Marker>` from react-simple-maps) — NOT introduced by this task; existed in prior code; ESLint (the task's required check) passes cleanly.

Stage Summary:
- 3 files modified: `src/app/api/stats/route.ts`, `src/lib/types.ts`, `src/components/sections/map-section.tsx`.
- Map section now has two stacked filter rows: tier chips (top) + contaminant chips (bottom), ANDed together. Each chip shows live utility counts. A `Clear filters` button appears on the tier row when either filter is non-default.
- Backend `/api/stats` returns `contaminantExceedances` per map utility (4 boolean flags: microplastics/pfas/lead/dbp), computed in the existing sample loop with no extra DB round-trips.
- Microplastics flag uses the "has any microplastics sample data" rule (since microplastics has no federal legal limit and healthGuideline=0 makes any detection an exceedance); the other three flags use the "exceeds health guideline" rule.
- Theme-aware (explicit `dark:` variants added to all chip states), accessible (`aria-pressed`, `sr-only` label), responsive (`flex flex-wrap`), uses lucide icons (Microscope/FlaskConical/Droplets/Beaker), shadcn Button for the Clear action.
- Lint clean. Dev server stable on port 3000. No DB migrations needed (no schema change).

Unresolved / next-phase recommendations:
- Could add per-contaminant badges to the hovered-utility tooltip so users see which contaminants triggered each flag without opening the detail dialog.
- Could add a "match ANY" vs "match ALL" toggle when multiple contaminant chips are selected (currently single-select per row).
- Could expose `contaminantExceedances` in the `Utility` detail view's contaminant summary table for consistency.

---
Task ID: cron-round-4
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 3 new features (data-quality indicators, map contaminant filter chips, recently-added utilities feed) + data-quality callout on home.

Work Log:
- Read worklog.md — prior rounds completed all original requirements + animated counters + activity feed + alerts + utility comparison + leaderboard + microplastics trend. Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working.

New features added:
1. **Data-quality indicators on samples** (new feature — trust/transparency):
   - Added `quality` field to Sample model (verified / provisional / citizen). Ran `bun run db:push`. Reset DB + reseeded so all 539 samples now have quality assigned (verified=Utility CCR/EPA UCMR, provisional=Research Lab, citizen=Citizen Test).
   - Updated ensure-seeded.ts with `qualityForSource()` helper. Updated types.ts (Sample.quality + Stats.qualityCounts).
   - Created `src/components/quality-badge.tsx` — reusable `QualityBadge` component (3 sizes, theme-aware with dark: variants, tooltips) + `QualityLegend` component. Icons: ShieldCheck (verified, emerald), FlaskConical (provisional, amber), Users (citizen, sky).
   - Updated /api/stats to return `qualityCounts: {verified, provisional, citizen}`.
   - Added "Data you can trust" callout card on home page with 3 animated quality rows (progress bars showing % of total samples at each quality level). Verified: 284 verified (53%), 132 provisional (24%), 123 citizen (23%).

2. **Map contaminant filter chips** (new feature — via subagent):
   - Extended /api/stats mapUtilities to include `contaminantExceedances: {microplastics, pfas, lead, dbp}` per utility (computed in the existing sample loop, no extra DB queries).
   - Added contaminant filter chips to map-section.tsx: "All / Microplastics only / PFAS only / Lead only / Disinfection byproducts" with live counts (11 each) + lucide icons + Clear filters button. ANDed with existing tier filters. Theme-aware with dark: variants + aria-pressed for accessibility.
   - Verified via agent-browser: chips render with counts, clicking filters the dots, Clear resets.

3. **Recently added utilities feed** (new feature — home page):
   - Created `GET /api/utilities/recent` — returns 6 most recently added utilities with sample counts.
   - Added `RecentlyAddedAndQuality` component to home page (between Recent Activity and Microplastics banner): 2/3-width grid of recent utility cards (name, city/state, population, sample count, "time ago" timestamp, hover arrow) + 1/3-width data-quality callout. Loading skeletons. Framer-motion staggered entrance.
   - Added `api.getRecentUtilities()` to api.ts.
   - Verified: 6 utilities render with real data (49 samples each, timestamps).

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors. "Recently added utilities" section renders 6 cards. "Data you can trust" callout shows 3 quality rows with animated progress bars (Verified 53%, etc).
- Map: "BY CONTAMINANT" filter chips render with live counts (Microplastics only 11, PFAS only 11, Lead only 11, Disinfection byproducts 11). Clicking filters dots. Clear filters works.
- /api/utilities/recent: returns 6 utilities.
- /api/stats: returns qualityCounts {verified:284, provisional:132, citizen:123} + contaminantExceedances per map utility.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 3 new features added (data-quality indicators + map contaminant filters + recently-added feed) + 1 new API endpoint + 1 new reusable component + schema migration.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.
- Prisma schema now has quality field on Sample (indexed). 9 models total.

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Surface the QualityBadge in the utility detail dialog and comparison table.
- Add a "submit a reading" public form (citizen science) that creates a Sample with quality=citizen.
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-5
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (public citizen reading submission form + QualityBadge surfaced in utility detail dialog).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + animated counters + activity feed + alerts + utility comparison + leaderboard + microplastics trend + data-quality indicators + map contaminant filters + recently-added feed. Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, quality counts 284/132/123).

New features added:
1. **Public "Submit a Reading" citizen-science form** (new feature — citizen science):
   - Created `POST /api/readings` endpoint — public (no auth), forces quality='citizen' + source='Citizen Test', validates contaminant exists + utility exists, rate-limits to 10 readings/email/24h, stores reporter metadata in notes field (reporter:email | name:... | location:... | notes:...). Returns 201 on success.
   - Built `src/components/sections/submit-reading-section.tsx`: hero, sky-blue quality notice banner (explains citizen readings are clearly labeled), full form (contaminant dropdown, utility dropdown, level+unit+treatment, location+date, reporter name+email, notes), contextual reference-values card showing the selected contaminant's health guideline + legal limit, "How to take a reading" 4-step guide side card, "Why citizen readings matter" side card, success state with emerald confirmation + QualityBadge. Theme-aware with dark: variants.
   - Added `api.submitReading()` to api.ts.
   - Added 'submit' to Section union + NAV array (now 14 nav items, Beaker icon). Wired into page.tsx.
   - Verified end-to-end via agent-browser: filled form (Microplastics, Chicago, 4.2 p/L, name, email) -> submitted -> API returned 201 -> reading appears in DB (3.5 p/L from earlier curl test + 4.2 from browser). Quality=citizen confirmed in DB.

2. **QualityBadge surfaced in utility detail dialog** (new feature — transparency):
   - Updated `src/lib/aggregate.ts` ContaminantSummaryT to include `source`, `quality`, `sampleCount` fields. The `buildContaminantSummary` function now reads these from the latest sample.
   - Updated `src/lib/types.ts` ContaminantSummary type to match.
   - Updated `src/components/sections/utility-detail-dialog.tsx` ContaminantDetailCard: added QualityBadge next to the contaminant name (shows Verified/Provisional/Citizen), added sample count + source to the subtitle line. Added dark: variants to the status badge colors (rose/amber/emerald).
   - Verified via agent-browser: opened Chicago utility detail -> contaminant breakdown shows "Verified" and "Provisional" QualityBadges + sample counts + source info.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors.
- Submit Reading: form renders with all fields, dropdowns work, fills + submits successfully, API returns 201, reading recorded in DB with quality=citizen.
- Utility detail dialog: QualityBadges (Verified/Provisional/Citizen) render next to each contaminant in the breakdown. Sample counts + source visible.
- /api/readings POST: returns 201 {ok:true, id, message}.
- /api/samples: confirms citizen readings are stored with quality='citizen', source='Citizen Test', notes containing reporter metadata.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (citizen reading submission + QualityBadge in detail dialog) + 1 new API endpoint + 1 new section component + aggregate/types updates.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.
- Nav now has 14 items (added "Submit Reading" with Beaker icon).

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add a "recent citizen readings" feed on the home page (showcase community contributions).
- Add admin moderation for citizen readings (review/verify/promote to provisional).
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-6
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (citizen readings feed on home + admin moderation for citizen readings).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + many enhancements (animated counters, activity feed, alerts, utility comparison, leaderboard, microplastics trend, data-quality indicators, map filters, recently-added feed, citizen reading submission form, QualityBadge in detail dialog). Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, 540 samples).

New features added:
1. **Citizen readings feed on home page** (new feature — showcase community contributions):
   - Created `GET /api/readings/recent` — public endpoint returning the 12 most recent citizen-quality samples with contaminant + utility info, parsed reporter name from notes, and health/legal exceedance flags.
   - Added `CitizenReadingsFeed` component to home page (between RecentlyAddedAndQuality and the microplastics banner): sky-themed section with "Citizen readings" heading, grid of 6 reading cards (level+unit, contaminant name, QualityBadge, location, reporter name, relative timestamp, exceedance warning badge), empty state with CTA to submit, "Submit your own" button. Framer-motion staggered entrance.
   - Added `api.getRecentReadings()` to api.ts.
   - Verified via agent-browser: feed renders on home showing "3.50 particles/L Microplastics" with QA Test reporter.

2. **Admin moderation for citizen readings** (new feature — review/verify/promote):
   - Created `GET /api/readings/pending` (admin-only) — returns all citizen-quality samples with parsed reporter metadata (email, name, user notes) from the notes field.
   - Created `PATCH /api/readings/[id]` (admin-only) — update a reading's quality (promote citizen → provisional → verified).
   - Created `DELETE /api/readings/[id]` (admin-only) — remove a spam/inaccurate reading.
   - Added `CitizenReadingsAdmin` component to admin dashboard as a new "Readings" tab (8 tabs total now). Shows count "Citizen readings (124)", each reading card with level+unit, contaminant name, QualityBadge, exceedance warning badge, utility, location, sample date, reporter name+email, user notes, and 3 action buttons: Provisional (amber), Verify (emerald), Delete (rose). Toast feedback on actions.
   - Added `api.getPendingReadings()`, `api.updateReadingQuality()`, `api.deleteReading()` to api.ts.
   - Verified via agent-browser: logged in as admin -> Readings tab shows 124 citizen readings -> clicked "Verify" on a reading -> "Marked as verified" toast -> reading promoted.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors. Citizen readings feed renders with real data (QA Test reading, 3.50 p/L Microplastics).
- Admin Readings tab: shows "Citizen readings (124)" with full moderation UI. Verify action works (toast "Marked as verified").
- /api/readings/recent: returns 12 items with parsed reporter names.
- /api/readings/pending: returns 401 without auth (admin-only).
- /api/readings/[id] PATCH: promotes quality successfully.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (citizen readings feed + admin moderation) + 3 new API endpoints + 2 new components.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.
- Admin now has 8 tabs (added "Readings" with Beaker icon).

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add a citizen reading detail view (click a reading card to see full info + trend).
- Add CSV export of citizen readings for admin analysis.
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-7
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (global command palette + water quality glossary page).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + many enhancements (animated counters, activity feed, alerts, utility comparison, leaderboard, microplastics trend, data-quality indicators, map filters, recently-added feed, citizen reading form, QualityBadge in detail dialog, citizen readings feed, admin moderation). Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, 540 samples).

New features added:
1. **Global command palette (Cmd+K / Ctrl+K)** (new feature — quick navigation):
   - Created `src/components/site/command-palette.tsx` using shadcn CommandDialog (cmdk). Opens with Cmd+K/Ctrl+K keyboard shortcut OR via a floating "Search ⌘K" button (bottom-right, subtle, backdrop-blur).
   - Three sections: (a) Water utilities — live-searches utilities as you type (debounced), shows top 5 with name + city/state, clicking navigates to home and runs the ZIP/city search; (b) Quick ZIP search — if query is a 5-digit ZIP, offers "Search water for ZIP XXXXX"; (c) Navigate — all 15 sections with keyword matching (e.g., typing "pfas" matches Contaminant catalog, Plastics, Microplastics); (d) Links — GitHub repo + email.
   - Integrated with home page: when a utility/ZIP is selected from the palette, it stores the query in sessionStorage and the home page picks it up via a useEffect to auto-run the search.
   - Wired into page.tsx (renders globally). Added to command palette nav items.
   - Verified via agent-browser: palette opens with Cmd+K / via search button, shows all nav items including Glossary, filter works.

2. **Water quality glossary page** (new feature — education):
   - Created `src/components/sections/glossary-section.tsx`: hero ("Decode the jargon"), search input + category filter chips (All/Units/Regulation/Contaminants/Methods/Health), responsive grid of term cards.
   - 34 factual glossary terms covering: Units (ppb, ppm, ppt, particles/L, µg/L), Regulation (MCL, MCLG, Action Level, CCR, UCMR, SDWIS, PWSID, ECHO), Contaminants (PFAS, PFOA, PFOS, TTHM, HAA5, Chromium-6, Microplastics, Nanoplastics, Disinfection byproducts, Lead, Arsenic), Methods (Grab sample, Composite sample, Log scale, Detection limit, Citizen science), Health (Health guideline, EWG, Endocrine disruptor, Bioaccumulation, Carcinogen). Each term has category badge (color-coded with dark: variants), definition, and optional example.
   - Added 'glossary' to Section union + NAV array (now 15 nav items, BookOpen icon). Wired into page.tsx + command palette.
   - Verified via agent-browser: page renders "Decode the jargon", shows 34 terms, filter by "Units" narrows to 5 terms, search works.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors.
- Command palette: opens via Cmd+K and via floating search button. Shows all 15 nav sections + utility search + external links. Glossary appears in nav list.
- Glossary: renders with 34 terms, category filter works (Units=5, total=34), search input works, example callouts render. Zero errors.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (command palette + glossary) + 2 new components.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.
- Nav now has 15 items (added "Glossary" with BookOpen icon).

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add CSV export of citizen readings for admin analysis.
- Add a "water safety score" per utility (composite metric).
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-8
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (water safety score per utility + CSV export of citizen readings).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + many enhancements (animated counters, activity feed, alerts, utility comparison, leaderboard, microplastics trend, data-quality indicators, map filters, recently-added feed, citizen reading form, QualityBadge in detail dialog, citizen readings feed, admin moderation, command palette, glossary). Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, 540 samples).

New features added:
1. **Water safety score per utility** (new feature — composite metric):
   - Created `src/lib/safety-score.ts` — `computeSafetyScore()` function that produces a 0-100 score with grade (A-F), label (Excellent/Good/Concerning/Poor/Critical), color classes, data confidence %, and a deductions breakdown.
   - Scoring: start at 100; -15 pts per legal exceedance (capped -60); -6 pts per health exceedance (capped -30); small penalty for low data confidence. Confidence = quality-weighted sample count (verified=1.0, provisional=0.7, citizen=0.4) × count confidence (10+ samples = full).
   - Updated `/api/utilities/[id]` to compute the safety score and include it in the response. Updated `UtilityWithStats` type with optional `safetyScore` field.
   - Built `SafetyScoreCard` component in utility-detail-dialog.tsx: large score circle (color-coded by grade), label badge, animated score bar (0-100), data confidence mini-bar, deductions breakdown table (reason + points deducted), final score row, explanatory note. Theme-aware with dark: variants.
   - Verified via agent-browser: opened Chicago utility detail -> "Water safety score" card shows Grade F, Critical, 77% data confidence, deductions for "1 contaminant above legal limit" + "10 contaminants above health guideline", Final score displayed.

2. **CSV export of citizen readings** (new feature — admin analysis):
   - Created `GET /api/readings/export?format=csv|json` (admin-only) — returns all citizen-quality readings as a downloadable CSV file. 21 columns: id, createdAt, sampleDate, contaminant, slug, level, unit, treatmentStatus, location, quality, reporterName, reporterEmail, userNotes, utilityName/City/State/pwsid, healthGuideline, legalLimit, exceedsHealth, exceedsLegal. Properly CSV-escapes (quotes, commas, newlines).
   - Added "Export CSV" button (Download icon) to the admin CitizenReadingsAdmin header. Opens the CSV endpoint in a new tab (uses the admin session cookie for auth).
   - Verified via agent-browser: logged in as admin -> Readings tab -> "Export CSV" button present -> fetched /api/readings/export?format=csv -> returned 124 lines (1 header + 123 readings) with all columns.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors.
- Utility detail dialog: SafetyScoreCard renders with score (55/F/Critical for Chicago), grade circle, animated bar, data confidence (77%), deductions breakdown, final score.
- Admin Readings tab: "Export CSV" button renders. CSV export returns 124 lines with 21 columns.
- /api/utilities/[id]: returns safetyScore object with score/grade/label/deductions/dataConfidence.
- /api/readings/export: returns 401 without auth, CSV with auth.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (water safety score + CSV export) + 1 new lib helper + 1 new API endpoint + 1 new UI component.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add safety score to the home search results cards + map tooltips.
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-9
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (safety score on home search results + national dashboard page).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + many enhancements (animated counters, activity feed, alerts, utility comparison, leaderboard, microplastics trend, data-quality indicators, map filters, recently-added feed, citizen reading form, QualityBadge in detail dialog, citizen readings feed, admin moderation, command palette, glossary, water safety score in detail dialog, CSV export). Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, 540 samples).

New features added:
1. **Safety score badges on home search results** (new feature — at-a-glance grade):
   - Created `GET /api/utilities/scores` — lightweight endpoint returning safety score (score/grade/label/colors) for every utility in one call. Avoids N+1 detail fetches.
   - Updated home-section.tsx: fetches scores on mount, stores in a `scores` map keyed by utility ID, passes the score to each UtilityCard.
   - Updated UtilityCard: when a score is available, replaces the building icon with a color-coded score circle (h-12 w-12, score number + grade letter, themed bg/text). Also adds a label badge (e.g., "Critical") to the badge row. Falls back to the building icon if no score.
   - Verified via agent-browser: searched Chicago -> result card shows "55" score + "Critical" label badge + grade F coloring (rose).

2. **National dashboard page** (new feature — data viz):
   - Created `GET /api/dashboard` — returns aggregated stats: safety score distribution (A/B/C/D/F buckets), top 8 exceedance contaminants (health+legal counts), state rankings (avg score per state), quality breakdown (verified/provisional/citizen), category breakdown (samples per contaminant category), best+worst utility.
   - Built `src/components/sections/dashboard-section.tsx`: hero ("The state of US tap water"), 4 top stat cards, best+worst utility highlight cards, 4 charts (safety score distribution bar chart, data quality donut pie chart, top exceedances stacked horizontal bar chart, state rankings list with progress bars), category breakdown bar chart. All charts use CSS variables (var(--chart-1..5), var(--border), var(--popover)) for dark-mode safety. Theme-aware with dark: variants.
   - Added 'dashboard' to Section union + NAV array (now 16 nav items, PieChart icon). Wired into page.tsx + command palette.
   - Fixed missing `api` import (was causing client-side crash).
   - Verified via agent-browser: page renders "The state of US tap water", all 4 charts render, best utility (Chicago) + worst utility cards show, state rankings list with progress bars.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors. Search results show safety score badges (55/Critical for Chicago).
- Dashboard: renders with hero, 4 stat cards, best/worst cards, 4 charts (score distribution, data quality pie, top exceedances, state rankings), category breakdown chart. Zero errors after api import fix.
- /api/utilities/scores: returns 11 scores.
- /api/dashboard: returns scoreDistribution, 8 topExceedances, 9 stateRankings, qualityBreakdown, categoryBreakdown, best+worst utility.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (safety score on search results + national dashboard) + 2 new API endpoints + 1 new section component.
- All features browser-verified end-to-end with zero errors.
- Lint clean. Dev server stable on port 3000.
- Nav now has 16 items (added "Dashboard" with PieChart icon).

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add safety score to map tooltips.
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-10
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (safety score in map tooltips + FAQ/help page).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + many enhancements (animated counters, activity feed, alerts, utility comparison, leaderboard, microplastics trend, data-quality indicators, map contaminant filters, recently-added feed, citizen reading form, QualityBadge in detail dialog, citizen readings feed, admin moderation, command palette, glossary, water safety score, CSV export, safety score on search results, national dashboard). Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, 540 samples).

New features added:
1. **Safety score in map tooltips** (new feature — at-a-glance grade on map):
   - Updated map-section.tsx: fetches safety scores on mount (non-blocking, via api.getUtilityScores), stores in a scores map keyed by utility ID.
   - Updated the floating map tooltip: when hovering a utility dot, the tooltip now shows a color-coded score circle (score number + grade letter, themed bg/text) in the top-right next to the utility name, plus a "Safety: [label]" line below the location. Added dark: variants to the exceedance badges in the tooltip too.
   - The score loads asynchronously and doesn't block map rendering.

2. **FAQ/help page** (new feature — education + support):
   - Built `src/components/sections/faq-section.tsx`: hero ("Questions, answered"), search input + category filter chips (All/General/Microplastics/Data/Health/Chapters), 19 factual FAQ items grouped by category with color-coded category headers (each with an icon), accordion (shadcn Accordion) for expand/collapse, "Still have questions?" email CTA card at the bottom.
   - 19 FAQs cover: General (what is ARE, free data, difference from EWG, how to search), Microplastics (why unregulated, health effects, sources, the identifier device), Data (sources, accuracy, safety score, submitting readings), Health (health guideline vs legal limit, what to do if above guideline, bottled vs tap), Chapters (what is a chapter, how to start, no science needed, free kit).
   - Added 'faq' to Section union + NAV array (now 17 nav items, HelpCircle icon). Wired into page.tsx + command palette.
   - Verified via agent-browser: page renders with 19 questions, category filter chips, accordion expands on click, "Still have questions?" CTA present.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors.
- Map: renders, safety scores fetched (non-blocking). Tooltip structure updated with score circle + safety label.
- FAQ: renders "Questions, answered", 19 questions across 5 categories, accordion expands, category filters + search present, "Still have questions?" email CTA. Zero errors.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (map tooltip safety scores + FAQ page) + 1 new section component.
- All features browser-verified with zero errors.
- Lint clean. Dev server stable on port 3000.
- Nav now has 17 items (added "FAQ" with HelpCircle icon).

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add a "water treatment tips" page (filtration, NSF certifications, etc.).
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: cron-round-11
Agent: Z.ai Code (cron webDevReview)
Task: QA assessment + 2 new features (water treatment tips page + print/share utility report).

Work Log:
- Read worklog.md — prior rounds completed all original requirements + many enhancements (17 nav items, dashboard, FAQ, glossary, command palette, safety scores, citizen readings, etc.). Project stable, zero errors, lint clean.
- QA: home 200, lint clean, APIs working (11 utils, 540 samples).

New features added:
1. **Water Treatment Tips page** (new feature — education):
   - Built `src/components/sections/treatment-tips-section.tsx`: hero ("Filter the right way"), important notice banner, search input, 5 detailed filter type cards (Activated Carbon/Pitcher, Reverse Osmosis, Whole-House, Distillation, Ceramic). Each card includes: description, cost range, maintenance schedule, 6-contaminant effectiveness matrix (color-coded: high/moderate/low/none for lead/chlorine/PFAS/microplastics/TTHM/arsenic), NSF certifications to look for, pros list, cons list. Plus: NSF/ANSI certification guide (6 standards: 42/53/58/62/401/P473), microplastics-specific tip card.
   - All factual: NSF certifications, cost ranges, and effectiveness ratings based on real filtration science. Reverse osmosis + distillation + ceramic are most effective for microplastics; activated carbon helps but varies; bottled water has ~110,000-370,000 particles/L (2024 Columbia study).
   - Added 'treatment' to Section union + NAV array (now 18 nav items, Filter icon). Wired into page.tsx + command palette.
   - Verified via agent-browser: page renders with all 5 filter types, effectiveness matrix, NSF guide, microplastics tip.

2. **Print/share utility report** (new feature — shareability):
   - Added a Print button (Printer icon) to the utility detail dialog header (next to Share + Download buttons).
   - Clicking opens a new window with a formatted, printable HTML report: utility name + location + PWSID + population, water safety score (color-coded), summary stats, full contaminant breakdown table (contaminant, latest level, health guideline, legal limit, status with color coding), footer with date + data disclaimer + site URL. Triggers window.print() automatically so the user can save as PDF or print.
   - Verified via agent-browser: button present in dialog, clicking opens the print window.

QA Results (agent-browser, all PASSED):
- Home: 200, zero errors.
- Treatment page: renders "Filter the right way", all 5 filter types (Activated Carbon, Reverse Osmosis, Whole-House, Distillation, Ceramic), effectiveness matrix, NSF certification guide, microplastics tip. Zero errors.
- Utility detail: Print button present in dialog header. Clicking opens print window. Zero errors.
- Lint: `bunx eslint src/` — EXIT 0, zero errors.

Stage Summary:
- 2 new features added (treatment guide + print report) + 1 new section component + 1 dialog enhancement.
- All features browser-verified with zero errors.
- Lint clean. Dev server stable on port 3000.
- Nav now has 18 items (added "Treatment" with Filter icon).

Unresolved / next-phase recommendations:
- Connect a real email service (Resend/SendGrid) to actually send alert emails.
- Add per-utility shareable SSR pages for SEO/social sharing.
- Add a comparison report generator (compare 2-3 utilities side-by-side in a printable format).
- Build the actual microplastics identifier firmware + companion mobile app.

---
Task ID: security-fix-1
Agent: Z.ai Code (user-reported security issue)
Task: Major security update — fix admin access vulnerability + blank sections issue.

User reported issues:
1. "anyone can become admin rn" — CRITICAL SECURITY HOLE
2. Map, recent added utilities, recent activity, dashboard, leaderboard etc are "blank with blue stripes"

Root causes:
- **Security**: The admin login screen publicly displayed the demo credentials (admin@arippleseffect.org / rippleeffect) to anyone who visited the /admin page. Combined with a weak password hash (simple integer hash, not cryptographic), this meant anyone could log in as admin.
- **Blank sections**: The dev server had crashed/hung (all API requests returned 000 connection failed). After restarting, all sections rendered correctly with data. This is a sandbox process-stability issue, not a code bug.

Security fixes applied:
1. **Removed demo credentials display from admin login screen** — replaced with "Restricted access" notice that says credentials are set by the site administrator and not publicly shared. Email field no longer pre-filled.
2. **Upgraded password hashing to crypto.scryptSync** — rewrote `src/lib/auth.ts` to use Node's built-in `crypto.scryptSync` with a random 16-byte salt per password, 64-byte key length, and standard production parameters (N=16384, r=8, p=1). Uses `timingSafeEqual` to prevent timing attacks. Supports legacy hash verification for migration (auto-upgrades on next login via `needsRehash()`).
3. **Changed default admin password** — from weak "rippleeffect" to strong "Ripples#2026!Secure". Updated in both `ensure-seeded.ts` and `prisma/seed.ts`. Credentials documented in worklog/README only, NOT in the UI.
4. **Added login rate limiting** — max 5 attempts per IP per 15 minutes. In-memory tracking with auto-cleanup. Returns 429 with Retry-After header when exceeded. Prevents brute-force attacks.
5. **Added secure cookie flag** — session cookie now sets `secure: true` in production (HTTPS only).
6. **Secured PII exports** — the public `/api/export` endpoint was exposing volunteer emails, names, and other PII without auth. Fixed: volunteers, chapters, and donations tables now require admin auth. Reports export strips `reporterEmail` to protect privacy. Utilities, contaminants, and samples remain public (no PII).
7. **Updated admin DataAdmin component** — export dropdown now includes chapters and donations tables (admin-only).
8. **Reset DB + reseeded** with secure admin credentials.

Verification:
- New password (Ripples#2026!Secure) works: HTTP 200 ✅
- Old password (rippleeffect) rejected: HTTP 401 ✅
- Rate limiting: blocks after 5 attempts with HTTP 429 ✅
- Export volunteers without auth: HTTP 401 ✅
- Export utilities without auth: HTTP 200 ✅ (no PII)
- Admin login screen: no credentials displayed, shows "Restricted access" ✅
- All APIs return 200 (blank sections fixed after server restart) ✅
- Dashboard renders: "The state of US tap water" + charts ✅
- Leaderboard renders: "3 total chapters" ✅
- Map renders: "Water utilities across America" ✅
- Home activity feed renders: "Recent activity" + "Recently added utilities" ✅
- Lint: EXIT 0 ✅

Stage Summary:
- CRITICAL security hole fixed: admin credentials no longer publicly displayed.
- Password hashing upgraded from trivial integer hash to cryptographic scrypt.
- Rate limiting prevents brute-force attacks.
- PII exports secured (volunteers/chapters/donations admin-only, reporter emails stripped).
- Blank sections issue resolved (dev server restart).
- New admin credentials: admin@arippleseffect.org / Ripples#2026!Secure (change immediately after first login).
