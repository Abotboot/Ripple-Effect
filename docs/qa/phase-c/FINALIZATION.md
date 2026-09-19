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
