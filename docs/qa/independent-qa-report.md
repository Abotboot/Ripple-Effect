# Independent QA & Data Provenance Audit Report

**Audit Target**: A Ripple Effect Initiative  
**Repository**: [https://github.com/Abotboot/Ripple-Effect](https://github.com/Abotboot/Ripple-Effect)  
**Live Site**: [https://rippleeffecter.netlify.app/](https://rippleeffecter.netlify.app/)  
**Audit Branch**: `agent/independent-qa`  
**Starting Commit SHA**: `cabf22861ec6646b16f26bcc568e99e9762df6ad`  
**Audit Date**: 2026-09-17  
**Runtime Environment**:
- **Node.js**: `v24.19.0`
- **npm**: `11.17.0`
- **Playwright**: `1.62.0`
- **Google Chrome**: `152.0.7977.83` (x86_64 / win32)
- **Host OS**: Windows 11

---

## Executive Summary

This independent quality assurance audit was performed under a strict read-only mandate (no data writes, no schema modifications, no application source alterations). All tests and deliverables remain isolated within `docs/qa/` and `scripts/qa/`.

### Key Findings Matrix

| Dimension | Status | Primary Observation | Severity |
| :--- | :--- | :--- | :--- |
| **Data Provenance** | **High Risk** | Pseudo-randomly generated sample levels are attributed to official sources (`Utility CCR`, `EPA UCMR`) with green `Verified` badges on real municipal utilities. Hardcoded fictional utility levels exist in `ContaminantSpectrumChart`. | **Critical** |
| **Animation rAF Leaks** | **Defect** | `TankCanvas` animation loop (`requestAnimationFrame`) never halts when scrolled 100% offscreen or when `prefers-reduced-motion: reduce` is active (~150–280 rAF calls/sec continuous spinning). | **Medium** |
| **Keyboard Escape Handling** | **Defect** | Pressing `Escape` on the intro `<dialog>` cancels native dismiss and initiates a 5.1s Three.js camera fly-through rather than closing the modal immediately. | **Medium** |
| **Responsive & Layout** | **Pass** | Zero horizontal overflow across all tested viewports (1440, 1024, 768, 390, 320 px). 200% zoom scaling clean. | **Low / Clean** |
| **Network Resilience** | **Pass** | Graceful degradation on API 500 failure; zero unhandled page crashes or white-screens. | **Low / Clean** |
| **npm Security Audit** | **Low Risk** | 10 advisories (6 high, 4 moderate); all are dev-only, build-time CLI tools (`prisma`), or unreferenced packages (`sharp`, `@mdxeditor/editor`, `react-syntax-highlighter`). Zero confirmed reachable vulnerabilities. | **Low** |

---

## 1. API and Data Provenance Audit

### 1.1 The Provenance Chain: Seed to User-Facing Badges

Tracing data generation from `prisma/seed.ts` and `src/lib/ensure-seeded.ts` through to rendering surfaces reveals that **simulated values are presented with official institutional attribution**.

```
[prisma/seed.ts & ensure-seeded.ts]
  └─ Math.floor(rand() * sourceOptions.length)
       ├─ source: 'Utility CCR' | 'EPA UCMR' | 'Research Lab' | 'Citizen Test'
       └─ quality: qualityForSource(source)
            ├─ 'Utility CCR' / 'EPA UCMR' ──> quality: 'verified'
            ├─ 'Research Lab'             ──> quality: 'provisional'
            └─ 'Citizen Test'             ──> quality: 'citizen'
                   │
                   ▼
[src/lib/aggregate.ts]
  └─ buildContaminantSummary()
       ├─ source: latest.source ?? 'Utility CCR'
       └─ quality: latest.quality ?? 'verified'
                   │
                   ▼
[src/components/quality-badge.tsx & source-badge.tsx]
  ├─ QualityBadge: 'Verified' (ShieldCheck icon, emerald styling: "Lab-verified. Measured by a utility, EPA program, or certified lab")
  └─ SourceBadge: 'Utility CCR' (Building2 icon: "From the utility’s own Consumer Confidence Report")
                   │
                   ▼
[src/components/sections/utility-detail-dialog.tsx]
  └─ Rendered on real municipal utilities (City of Chicago, NYC DEP, LADWP, Houston Public Works)
       ├─ Shows synthetic numeric concentrations as official measurements
       ├─ Flags real cities with "Above legal limit" or "Above health guideline"
       └─ Generates downloadable PDF/Print report citing "Freshwater database"
```

### 1.2 Exact Code Evidence

#### Evidence Item A: Simulated Generation and Random Institutional Labeling
- **File**: [`src/lib/ensure-seeded.ts`](file:///C:/Users/ayada/Ripple-Effect/src/lib/ensure-seeded.ts#L300-L325)
  - **Lines 300–305**:
    ```ts
    const sourceOptions = ['Utility CCR', 'Research Lab', 'Citizen Test', 'EPA UCMR']
    const qualityForSource = (src: string): string =>
      src === 'Utility CCR' || src === 'EPA UCMR' ? 'verified'
      : src === 'Research Lab' ? 'provisional'
      : 'citizen'
    ```
  - **Lines 313–322**:
    ```ts
    const level = +(r[0] + rand() * (r[1] - r[0]) * mod).toFixed(3)
    const source = sourceOptions[Math.floor(rand() * sourceOptions.length)]
    samples.push({
      utilityId: utilityIds[u.pwsid], contaminantId: c.id, level,
      unit: c.legalLimitUnit || c.healthGuidelineUnit || 'ppb',
      sampleDate: date, source,
      treatmentStatus: u.treatmentStatus,
      location: rand() < 0.5 ? 'Treatment Plant Outflow' : 'Distribution Tap',
      quality: qualityForSource(source),
    })
    ```
  - **Identical logic in [`prisma/seed.ts:466-528`](file:///C:/Users/ayada/Ripple-Effect/prisma/seed.ts#L466-L528)**.

#### Evidence Item B: Misleading Quality and Source Badges
- **File**: [`src/components/quality-badge.tsx`](file:///C:/Users/ayada/Ripple-Effect/src/components/quality-badge.tsx#L12-L17)
  - **Lines 12–17**:
    ```ts
    verified: {
      label: 'Verified',
      icon: ShieldCheck,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200...',
      title: 'Lab-verified. Measured by a utility, EPA program, or certified lab',
    }
    ```
- **File**: [`src/components/source-badge.tsx`](file:///C:/Users/ayada/Ripple-Effect/src/components/source-badge.tsx#L75-L80)
  - **Lines 75–80**:
    ```ts
    'Utility CCR': {
      label: 'Utility CCR',
      icon: Building2,
      className: 'bg-teal-100 text-teal-700...',
      title: 'From the utility’s own Consumer Confidence Report',
    }
    ```
- **File**: [`src/components/sections/utility-detail-dialog.tsx`](file:///C:/Users/ayada/Ripple-Effect/src/components/sections/utility-detail-dialog.tsx#L360-L361)
  - **Lines 360–361**:
    ```tsx
    <QualityBadge quality={summary.quality} size="xs" />
    <SourceBadge source={summary.source} robot={summary.robot} size="xs" />
    ```

#### Evidence Item C: Hardcoded Fictional Measurements in Interactive Spectrum Chart
- **File**: [`src/components/d3/contaminant-spectrum-chart.tsx`](file:///C:/Users/ayada/Ripple-Effect/src/components/d3/contaminant-spectrum-chart.tsx#L47-L135)
  - Real water suppliers are hardcoded with specific contaminant values without citation:
    - Charlotte Water: PFOA 5.4 ppt (Line 48)
    - Cape Fear Public Utility: PFOA 8.2 ppt (Line 51)
    - Chicago Water Dept: Microplastics 7.2 p/L (Line 68)
    - New Orleans S&WB: Microplastics 9.8 p/L (Line 70)
    - Chicago Dept of Water: Lead 4.8 ppb (Line 88)
    - Houston Public Works: TTHMs 48.0 ppb (Line 108)
    - Phoenix Water Services: TTHMs 52.0 ppb (Line 110)
    - Tucson Water: Arsenic 3.4 ppb (Line 128)

#### Evidence Item D: Simulated Composite Water Safety Scores
- **File**: [`src/app/api/utilities/scores/route.ts`](file:///C:/Users/ayada/Ripple-Effect/src/app/api/utilities/scores/route.ts#L61-L69) and [`src/lib/safety-score.ts`](file:///C:/Users/ayada/Ripple-Effect/src/lib/safety-score.ts#L26-L79)
  - Deducts points based on whether simulated samples exceed federal legal limits (-15 pts per exceedance) and health guidelines (-6 pts per exceedance).
  - Assigns grades (A, B, C, D, F) to real cities based on random number generator outputs (`rand()`).

### 1.3 Safe Migration Proposal: 3-Tier Data Provenance Architecture

To prevent legal exposure and maintain scientific credibility while preserving prototype utility, the database schema and UI must formally partition data into three mutually exclusive tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PROVENANCE TIERS                           │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Tier 1: DEMO / MODEL  │ Tier 2: CITIZEN        │ Tier 3: INSTITUTIONAL │
│ (Illustrative)        │ (Community Collected)  │ (Verified Compliance) │
├───────────────────────┼────────────────────────┼───────────────────────┤
│ • provenance: 'demo'  │ • provenance: 'citizen'│ • provenance: 'gov'   │
│ • Badge: "Model Data" │ • Badge: "Citizen"     │ • Badge: "EPA / CCR"  │
│ • Clear disclaimer:   │ • Quality: field test, │ • Requires verifiable │
│   "Synthetic estimate │   volunteer sample     │   PWSID, report year, │
│   for demonstration"  │ • Not EPA certified    │   and source URL      │
└───────────────────────┴────────────────────────┴───────────────────────┘
```

#### Step-by-Step Migration Plan (Zero Data Loss):
1. **Prisma Schema Update**:
   - Add `provenance` enum to `Sample` model:
     ```prisma
     enum DataProvenance {
       ILLUSTRATIVE_MODEL
       CITIZEN_CONTRIBUTED
       VERIFIED_REGULATORY
     }
     ```
   - Add `sourceUrl` (`String?`) and `reportingPeriod` (`String?`).
2. **Seed Migration**:
   - Update `prisma/seed.ts` and `src/lib/ensure-seeded.ts` to assign all generated seed records `provenance: 'ILLUSTRATIVE_MODEL'`.
   - Replace randomly chosen `sourceOptions` with `source: 'Demonstration Model (Orb/EWG Calibration)'`.
3. **Badge & UI Alignment**:
   - Update `QualityBadge`: When `provenance === 'ILLUSTRATIVE_MODEL'`, render an amber/slate pill badge reading **"Model Estimate"** (`title="Synthetic calibration estimate for interface demonstration. Not an authenticated compliance record."`).
   - Reserve **"Verified"** strictly for records containing verified EPA SDWIS or CCR ingest IDs.
4. **Safety Score Card Disclaimers**:
   - In `UtilityDetailDialog`, display an explicit indicator:
     `"Demo Mode: Safety score derived from illustrative reference models. Verify with your municipality's official annual CCR."`

---

## 2. Browser & Viewport Verification

Automated checks were executed via Playwright (`scripts/qa/browser-checks.cjs`) on Google Chrome (`152.0.7977.83`) across five target viewports.

### 2.1 Viewport Responsiveness & Layout

| Viewport | Device Profile | Width | Height | Horizontal Overflow | Page Errors | Screenshot Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `1440_desktop` | Desktop Standard | 1440px | 900px | **PASS** (1440/1440) | 0 | `viewport_1440_desktop.png` |
| `1024_tablet_landscape` | Tablet Landscape | 1024px | 768px | **PASS** (1024/1024) | 0 | `viewport_1024_tablet_landscape.png` |
| `768_tablet_portrait` | Tablet Portrait | 768px | 1024px | **PASS** (768/768) | 0 | `viewport_768_tablet_portrait.png` |
| `390_mobile_standard` | iPhone 14 / Modern Mobile | 390px | 844px | **PASS** (390/390) | 0 | `viewport_390_mobile_standard.png` |
| `320_mobile_narrow` | iPhone SE / Narrow Screen | 320px | 568px | **PASS** (320/320) | 0 | `viewport_320_mobile_narrow.png` |

- **Zero layout blowouts**: No elements exceeded `window.innerWidth`. The grid layout and clamp typography adapt cleanly down to 320px.

### 2.2 Interactive Checks & Accessibility Defect Log

#### DEFECT QA-01: Escape Key Hijacked by 5-Second Animation Sequence
- **Severity**: **Medium** (WCAG 2.1 SC 2.1.2 - No Keyboard Trap / SC 2.5.3)
- **Component**: [`src/components/atmosphere/tank-hero.tsx:143`](file:///C:/Users/ayada/Ripple-Effect/src/components/atmosphere/tank-hero.tsx#L143)
- **Reproduction Steps**:
  1. Open `http://localhost:3020/?intro=1`.
  2. With the `<dialog>` modal open, press the `Escape` key.
- **Observed Behavior**:
  - `onCancel={(e) => { e.preventDefault(); enter() }}` intercepts native Escape dismissal.
  - Instead of dismissing the dialog immediately, `enter()` triggers a 5.1-second GSAP camera dive timeline. The modal remains visible and interactive elements fade to opacity 0 while the camera moves.
- **Expected Behavior**:
  - Pressing `Escape` should immediately execute `skip()` / `finishEntry()`, detaching the dialog and returning focus to the page without delay.
- **Playwright Evidence**: Verified in `scripts/qa/browser-checks.cjs` (Esc dismiss returned `false` at 1440px and 390px).

#### CHECK QA-02: Visible Focus & Tab Trapping
- **Status**: **PASS**
- **Artifact**: `keyboard_focus_tabbing.png`
- **Observations**:
  - Tab navigation cycles smoothly through header buttons, home links, search input, and navigation links.
  - Active elements receive an explicit `:focus-visible` emerald border (`rgb(29, 242, 179) solid 2px`).
  - Hero heading `Clear water. Unclear consequences.` has no focus outline box (confirmed resolved).

#### CHECK QA-03: Reduced Motion (`prefers-reduced-motion: reduce`)
- **Status**: **PASS**
- **Observations**:
  - Clicking `ENTER THE CURRENT ↗` in reduced-motion mode instantly detaches `<dialog>` without running the Three.js camera tween (`immediateDismiss: true`).
  - Fluid cursor dot is completely hidden (`display: none` via media query).

#### CHECK QA-04: Zoom Scaling (200%)
- **Status**: **PASS**
- **Artifact**: `zoom_200_percent.png`
- **Observations**:
  - Scaled to 200% via browser zoom; text remains legible without clipping or horizontal overflow.

#### CHECK QA-05: Read-Only ZIP Search
- **Status**: **PASS**
- **Artifacts**: `search_valid_zip.png`, `search_invalid_zip.png`
- **Observations**:
  - Query `60614` returns 1 utility card ("City of Chicago Department of Water Management") with no errors.
  - Query `00000` triggers the "No utilities found" toast cleanly without page crash.

#### CHECK QA-06: Unavailable Network Resilience
- **Status**: **PASS**
- **Artifact**: `network_failure_500.png`
- **Observations**:
  - When `/api/stats` and `/api/utilities/scores` return HTTP 500, the page gracefully catches the errors; zero uncaught exceptions, and hero/search remained fully interactive.

---

## 3. Bundle Sizes & Animation Resource Audit

### 3.1 Uncompressed First-Load JavaScript
Extracted from `.next/diagnostics/route-bundle-stats.json`:
- **Route `/` (Homepage)**: **2,123,156 bytes (~2.02 MB uncompressed)**
- **Route `/_not-found`**: **527,153 bytes (~515 KB uncompressed)**

#### Top 5 Static Chunks:
1. `2yf0n2qwr-4yy.js`: **550.5 KB** (`three`, `@studio-freight/lenis`, `gsap`)
2. `3nagkcq6qutd_.js`: **396.2 KB** (D3 scale/shapes, Radix UI)
3. `3tb13l4qs7vl-.js`: **355.6 KB** (Application core components)
4. `3bibs1f8e36di.js`: **229.2 KB** (Next.js / React DOM runtime)
5. `1ojza5fy45tnc.css`: **179.2 KB** (Compiled Tailwind + atmospheric CSS)

### 3.2 Animation Resource Cleanup Audit

Executed via [`scripts/qa/resource-audit.cjs`](file:///C:/Users/ayada/Ripple-Effect/scripts/qa/resource-audit.cjs):

#### DEFECT QA-03: `requestAnimationFrame` Leak in `TankCanvas`
- **Severity**: **Medium** (CPU / Battery Drain)
- **Component**: [`src/components/atmosphere/tank-hero.tsx:39-42`](file:///C:/Users/ayada/Ripple-Effect/src/components/atmosphere/tank-hero.tsx#L39-L42)
- **Measured Data**:
  - **In-View Hero FPS**: **~81 rAF calls/sec**
  - **Offscreen (Scrolled 3000px down) FPS**: **~287 rAF calls/sec**
  - **Under `prefers-reduced-motion: reduce` FPS**: **~154 rAF calls/sec**
- **Root Cause**:
  ```ts
  const tick = (time: number) => {
    if (visible && !document.hidden && !reduced.matches && time - last >= 16) {
      draw(time, Math.min((time - last) / 16.667, 2));
      last = time;
    }
    frame = requestAnimationFrame(tick); // <-- BUG: Always schedules next frame regardless of visibility or reduced motion!
  }
  ```
- **Remediation**:
  When `!visible`, `document.hidden`, or `reduced.matches`, cancel the loop and only re-schedule `frame = requestAnimationFrame(tick)` when `IntersectionObserver` reports `isIntersecting === true` or visibility changes.

#### CHECK QA-07: WebGL Failure Trap Resistance
- **Status**: **PASS**
- **Test**: Simulated `canvas.getContext('webgl2') === null` and `canvas.getContext('webgl') === null`.
- **Result**: `MicroscopeStage` line 20 checks `supported`; if false, it immediately calls `done.current()`, bypassing the cutscene without trapping the visitor.

#### CHECK QA-08: DOM & Context Stability on Revisit
- **Status**: **PASS**
- **Test**: 5 repeated route flip cycles (`#home` -> `#map` -> `#home`).
- **Result**: Canvas element count remained constant at exactly 2 across all cycles. No orphaned DOM nodes or duplicate dialogs detected.

---

## 4. npm Audit Vulnerability Analysis

Executed via `npm audit --json` on `main`:
- **Total Dependencies**: 1,047 (579 prod, 380 dev, 136 optional, 3 peer)
- **Total Vulnerabilities**: 10 (6 High, 4 Moderate, 0 Critical)

### 4.1 Vulnerability Reachability Triage

| Package | Severity | Advisory ID / CVE | Path in Dependency Tree | Reachable in Production? | Evidence / Triage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sharp` | High | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c | `sharp` (Direct in `package.json`) | **NO** | `sharp` is declared in `package.json` but never imported or invoked in `src/`. |
| `deepmerge-ts` | High | GHSA-ggr8-5vv4-36mx | `prisma` -> `@prisma/config` -> `deepmerge-ts` | **NO** | CLI tool dependency during schema build/migration. Not reachable by HTTP requests. |
| `prisma` | High | Via `deepmerge-ts` | `prisma` (Dev dependency) | **NO** | CLI build-time tool. |
| `d3-color` | High | GHSA-36jr-mh4h-2g58 | `d3-scale` -> `d3-interpolate` -> `d3-color` | **NO** | Transitive dependency of D3 scale. No user-supplied strings are passed to `d3.color()`. |
| `js-yaml` | High | GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m | `@mdxeditor/editor` -> `js-yaml` | **NO** | `@mdxeditor/editor` is in `package.json` but has 0 import references in `src/`. |
| `prismjs` | Moderate | GHSA-x7hr-w5r2-h6wg | `react-syntax-highlighter` -> `refractor` -> `prismjs` | **NO** | `react-syntax-highlighter` is in `package.json` but has 0 import references in `src/`. |
| `react-syntax-highlighter` | Moderate | Via `prismjs` | Direct in `package.json` | **NO** | Unreferenced orphan package. |
| `refractor` | Moderate | Via `prismjs` | Transitive of `react-syntax-highlighter` | **NO** | Unreferenced orphan package. |

**Triage Summary**: Zero vulnerabilities are reachable in the runtime application. Removing dead dependencies (`@mdxeditor/editor`, `react-syntax-highlighter`, `sharp`) in a future maintenance pass will eliminate 7 out of 10 audit warnings cleanly.

---

## 5. ThreeUI / Perspective Component Licensing Note

- **Catalog Review**: The project components were reviewed against the catalog.
- **Status**: No proprietary or paid Pro components from ThreeUI / Perspective UI were copied or scraped.
- **Guidance**: All depth, perspective, and 3D optical treatments implemented in `MicroscopeStage` and `SpecimenInspector` use standard open-source `three.js` primitives (`PerspectiveCamera`, `RoomEnvironment`, `RoundedBoxGeometry`, `MeshPhysicalMaterial`). If official Perspective UI components are licensed in the future, integration should occur via authorized package channels.

---

## 6. QA Deliverables Index

- **Report**: [`docs/qa/independent-qa-report.md`](file:///C:/Users/ayada/Ripple-Effect/docs/qa/independent-qa-report.md)
- **Browser Test Script**: [`scripts/qa/browser-checks.cjs`](file:///C:/Users/ayada/Ripple-Effect/scripts/qa/browser-checks.cjs)
- **Resource Audit Script**: [`scripts/qa/resource-audit.cjs`](file:///C:/Users/ayada/Ripple-Effect/scripts/qa/resource-audit.cjs)
- **Browser Check Results**: [`docs/qa/browser-checks-results.json`](file:///C:/Users/ayada/Ripple-Effect/docs/qa/browser-checks-results.json)
- **Resource Audit Results**: [`docs/qa/resource-audit-results.json`](file:///C:/Users/ayada/Ripple-Effect/docs/qa/resource-audit-results.json)
- **Screenshots Directory**: [`docs/qa/screenshots/`](file:///C:/Users/ayada/Ripple-Effect/docs/qa/screenshots/)
  - `viewport_1440_desktop.png`
  - `viewport_1024_tablet_landscape.png`
  - `viewport_768_tablet_portrait.png`
  - `viewport_390_mobile_standard.png`
  - `viewport_320_mobile_narrow.png`
  - `keyboard_focus_tabbing.png`
  - `search_valid_zip.png`
  - `search_invalid_zip.png`
  - `network_failure_500.png`
  - `zoom_200_percent.png`
