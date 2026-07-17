# Task ID: f1-compare
**Agent:** Z.ai Code (subagent — compare section)
**Task:** Build `compare-section.tsx` — utility comparison feature (select 2-3 utilities, side-by-side contaminant comparison with log-scale grouped bar chart, color-coded table, cleanest-winner trophy).

## Work Log
- Read `worklog.md` for project context (theme system, section pattern, CSS vars for dark-mode charts: `--muted-foreground`, `--border`, `--popover`, `--chart-1..5`; section pattern: `'use client'` named export, framer-motion staggered `container`/`item` variants, shadcn/ui, `bg-water-hero`).
- Inspected `microplastics-section.tsx` for the dark-mode-safe chart pattern (CSS-variable-based axis/grid/tooltip styles, no hardcoded oklch).
- Inspected `api.ts` → confirmed `api.compareUtilities(ids)` exists and returns the shape the task specifies (`utilities[]` + `rows[]` with `perUtility[]` + `bestUtilityId`).
- Inspected `api/utilities/compare/route.ts` → confirmed the API sorts rows with microplastics first, and that `legalLimit`/`healthGuideline` come from the contaminant (used for cell color-coding).
- Verified shadcn components available: Card, Badge, Button, Input, Checkbox, Label, Skeleton, Table family. Verified `useToast` hook at `@/hooks/use-toast`. Verified lucide icons (`GitCompareArrows`, `Trophy`, `RotateCcw`, `Check`, `Loader2`, `Search`, `BarChart3`, `FlaskConical`, `Droplets`, `Users`, `MapPin`) all exist in `lucide-react@0.525.0`.
- Created `/home/z/my-project/src/components/sections/compare-section.tsx` (~580 lines).

## Component structure
1. **Hero** (`bg-water-hero`): "Compare utilities" badge, "Side-by-side comparison" title, subtitle explaining microplastics shown first.
2. **Selection card** (Card with header showing `{n}/3 selected` badge): search input, scrollable list (`max-h-64 overflow-y-auto`, `scrollbarWidth: thin`) of checkbox rows (utility name + city/state + population served), selection-order badges, disabled state when 3 already chosen. Side panel: "How it works" mini-guide + Compare button (disabled until 2+ selected, spinner state while fetching) + Reset button.
3. **Empty state** (dashed Card): friendly prompt with example "Try comparing Chicago, NYC, and Seattle."
4. **Loading skeleton**: 3 summary-card skeletons + chart skeleton + table skeleton.
5. **Results** (only after Compare click):
   - Summary cards: one per utility (numbered chip colored from `--chart-1/2/3`, name, city/state/PWSID, population, source, treatment, "Best levels" count). Trophy "Cleanest" badge on the utility with the most `bestUtilityId` wins (emerald ring).
   - Grouped `BarChart` (recharts): one `<Bar>` per utility, colored via `var(--chart-1/2/3)`. **LOG scale** Y-axis with dynamic lower-bound (one order of magnitude below the smallest measured value — covers ppt through ppm ranges). X-axis labels slanted -20°, `textAnchor="end"`. `<Legend>` with theme-aware foreground color. Theme-aware axis/grid/tooltip via CSS variables (NO hardcoded oklch). Null/0 levels are skipped (recharts handles null gracefully).
   - Detailed comparison `Table`: rows = contaminants (microplastics first via API sort + amber "Tracked by us" badge on that row), columns = each utility's level + Health guideline + Legal limit. Cells color-coded: rose for > legal limit, amber for > health guideline, emerald for the lowest (best) value in that row, with a `<Check>` icon. Sample-count annotation `(n)` next to each level. "Unregulated" rendered in the Legal limit column when not regulated. Color-coded legend strip below the table.
6. **Animations**: framer-motion staggered `container`/`item` variants for the summary cards; fade-in-up motion for the table card.
7. **Error handling**: `useToast` for failed `listUtilities` and failed `compareUtilities` calls (destructive variant, real error message from `Error.message`).

## Technical notes
- `CompareResult` type aliased as `Awaited<ReturnType<typeof api.compareUtilities>>` — keeps the type in sync with the api helper automatically.
- Chart `yDomain` computed dynamically via `useMemo` so the log axis always spans below the smallest measured value. `[floor, 'auto']` where `floor = 10^(floor(log10(min)) - 1)`.
- All colors are CSS variables or Tailwind classes with explicit `dark:` variants. The only `style={{ background: ... }}` calls use `UTILITY_COLORS` which are `var(--chart-1/2/3)` strings — these resolve at runtime in both light and dark mode.
- Responsive: table wrapped in `overflow-x-auto` (shadcn Table already does this), chart is `h-[400px] w-full` via `ResponsiveContainer`. Summary grid is `sm:grid-cols-2 lg:grid-cols-3`. Selection area is `md:grid-cols-3` (list spans 2, actions panel spans 1).
- No `'compare'` route added to `Section` type or `page.tsx` wiring — task scope is the component file only. The wiring is left for the main agent / a follow-up task.

## Lint / type check
- `bunx eslint src/components/sections/compare-section.tsx` → EXIT 0 (no errors, no warnings).
- `bunx tsc --noEmit --skipLibCheck` → no errors mentioning `compare-section`.
- Dev server (`dev.log`) shows `✓ Compiled in 9.5s` with no errors related to the new file.

## Stage Summary
- File delivered: `/home/z/my-project/src/components/sections/compare-section.tsx`.
- Lint-clean, type-clean, dev-server-clean.
- Not yet wired into `src/app/page.tsx` (out of scope for this task — main agent or a follow-up task can add `'compare'` to the `Section` union in `site-header.tsx` and a `{section === 'compare' && <CompareSection />}` line in `page.tsx`).
