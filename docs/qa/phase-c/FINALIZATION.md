# Final preview review

The first published review of `1483d0a` found two issues not covered by the
earlier local acceptance: selected granules exposed bright rectangular crop
surroundings, and Netlify injected a review toolbar which the existing content
security policy blocked. The toolbar produced an obstructive gray frame.

The deploy permalink also acquired that toolbar during browser execution,
despite having no injected toolbar in the initial HTTP response. Accordingly,
an HTTP 200 or a server-markup check was not accepted as proof of a clean preview.

## Preview configuration

In the existing `rippleeffecter` project's **Developer settings → Collaboration
tools**, only **Netlify Drawer on Deploy Previews** was changed from enabled to
disabled. The saved UI then reported **Netlify Drawer: Disabled**, and a page
reload confirmed the setting persisted. Branch-deploy Drawer and the
published-site heads-up display remained disabled.

No security header, site visibility setting, production deployment setting,
database configuration, or access permission was relaxed. This uses Netlify's
documented collaboration configuration, not CSS hiding of a failed iframe.

Reference: https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/

## Published-build verification

The final published check completed at **2026-09-19T05:10:52.766Z** against
code revision **5d5dacf023432cf8dde61e71068aa1ea0262ba8b**, after its Netlify
commit status reported success. Both **1440×900** and **390×844** cases passed
in Chrome 152.0.7977.83. The five-second original video ended naturally at rate
1 with no seeking; its black terminal frame matched the first live canvas,
and the same canvas continued into the artwork.

All four category selections and paused-frame stability passed. There were
**zero Netlify Drawer iframes, zero API requests, zero console/page errors,
and no horizontal overflow**. The desktop and mobile granule screenshots were
reviewed for crop edges; the bright rectangular surroundings are gone.

Measured results: [deployed/results.json](deployed/results.json).
Published screenshots: [desktop artwork](deployed/1440-all.png),
[desktop granules](deployed/1440-granules.png),
[mobile artwork](deployed/390-all.png), and
[mobile granules](deployed/390-granules.png).

This deployment evidence is committed separately from the tested application
revision; it changes documentation and screenshots only.

`scripts/qa/phase-c-deployed.cjs` verifies the actual published study route in
desktop and mobile Chromium contexts. It captures the natural final video frame
and initial live canvas, verifies optical-black equality and canvas identity,
exercises all category controls while paused, and checks for an absent injected
toolbar. Both console errors and uncaught JavaScript errors count as failures.
Every API request is intercepted and fails the isolated-study check; no backend
data is requested. Raw results and screenshots are saved under `deployed/`.

Run with an already-installed Playwright package and Chrome:

```text
node scripts/qa/phase-c-deployed.cjs
```

`QA_EXPECTED_COMMIT` records the separately verified published revision;
`QA_DEPLOY_URL` can select the existing preview or an observed deploy permalink.
The expected revision is not inferred from a local Git checkout.
