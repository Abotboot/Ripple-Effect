/* eslint-disable @typescript-eslint/no-require-imports -- Local app with isolated GET fixtures. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadPlaywright, contained, sha256 } = require('../../phase-b/source-recovery/offline-tools.cjs');
const base = new URL(process.env.QA_BASE_URL || 'http://localhost:3020');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw Error('Map fixture QA requires a local app');
const output = __dirname;
const root = path.resolve(output, '../../../..');
const unavailable = { status: 'unavailable', sampleCount: null, eligibleSampleCount: null,
  healthCompared: null, legalCompared: null, healthAbove: null, legalAbove: null };
const unreviewed = { status: 'not_assessed', sampleCount: 3, eligibleSampleCount: 0,
  healthCompared: 0, legalCompared: 0, healthAbove: null, legalAbove: null };
const utilities = [
  { id: 'fixture-one', name: 'Fixture Chicago utility', city: 'Chicago', state: 'IL', pwsid: 'QA-ONLY-1', population: 1200, latitude: 41.8781, longitude: -87.6298 },
  { id: 'fixture-two', name: 'Fixture New York utility', city: 'New York', state: 'NY', pwsid: 'QA-ONLY-2', population: 900, latitude: 40.7128, longitude: -74.006 },
  { id: 'fixture-outside', name: 'Fixture outside US projection', city: 'Fixture city', state: 'XX', pwsid: 'QA-ONLY-3', population: 0, latitude: 0, longitude: 0 },
];
const legacy = { status: 'degraded', code: 'legacy_sample_schema', provenanceAvailable: false };
function stats(mode) {
  const mixed = mode === 'mixed';
  return {
    utilitiesCount: 3, contaminantsCount: 1, samplesCount: 9, reportsCount: 0, volunteersCount: 0,
    chaptersCount: 0, donationsCount: 0, donationsTotal: 0, statesCovered: 3, populationServed: 2100,
    microplasticsAvg: null, microplasticsCohortCount: 0, healthExceedances: 0, legalExceedances: mixed ? 1 : 0,
    trackedByUsCount: 0, qualityCounts: { verified: mixed ? 1 : 0, provisional: 0, citizen: 0, unreviewed: 9, illustrative: 0 },
    dataStatus: mixed ? { status: 'available', code: null, provenanceAvailable: true } : legacy,
    mapUtilities: utilities.map((utility, index) => ({ ...utility, healthExceedances: 0, legalExceedances: 0,
      contaminantExceedances: { microplastics: false, lead: mixed && index === 0, pfas: false, dbp: false },
      assessment: mixed && index === 0 ? { ...unreviewed, status: 'assessed', eligibleSampleCount: 1, healthCompared: 0, legalCompared: 1, legalAbove: 1 } : unreviewed })),
  };
}
const detail = { ...utilities[0], zipCodes: '00000', sourceType: 'Surface', treatmentStatus: 'Treated',
  systemType: 'Community', county: null, website: null, notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
  totalSamples: 3, contaminantSummaries: [], exceedances: 0, healthExceedances: 0, dataStatus: legacy };
const report = { status: 'running', scope: 'Local app, every API request intercepted with synthetic fixtures; no live data or writes',
  sourceSHA256: sha256(fs.readFileSync(path.join(root, 'src/components/sections/map-section.tsx'))), cases: [] };
const save = () => fs.writeFileSync(path.join(output, 'map-verification.json'), JSON.stringify(report, null, 2) + '\n');

(async () => {
  const { chromium, executablePath } = loadPlaywright();
  const oldTemp = process.env.TEMP, oldTmp = process.env.TMP;
  const scratch = fs.mkdtempSync(contained(output, '.browser-'));
  let browser;
  try {
    process.env.TEMP = process.env.TMP = scratch;
    browser = await chromium.launch({ executablePath, headless: true, downloadsPath: scratch });
    report.browser = browser.version();
    async function run(name, width, state, verify) {
      const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 960 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const requests = [], errors = [], nonGets = [];
      await context.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url());
        requests.push({ path: url.pathname + url.search, method: request.method() });
        if (request.method() !== 'GET') { nonGets.push(request.method()); await route.abort(); return; }
        let status = 200, body;
        if (url.pathname === '/api/stats' && url.searchParams.get('view') === 'map') {
          status = state.locationFailure ? 503 : 200;
          body = { mapUtilities: utilities.map(u => ({ ...u, assessment: unavailable })), locationsCount: 3, unmappedCount: 0, assessments: 'not_requested' };
        } else if (url.pathname === '/api/stats') {
          status = state.assessmentFailure ? 503 : 200;
          body = stats(state.mode);
        } else if (url.pathname === '/api/utilities/near') {
          status = state.radiusFailure ? 503 : 200;
          body = { utilities: [{ ...utilities[0], distanceMiles: 0 }], count: 1, radiusMiles: 300 };
        } else if (url.pathname === '/api/utilities/fixture-one') {
          status = state.detailFailure ? 503 : 200;
          body = detail;
        } else {
          body = ({ '/api/utilities': [], '/api/utilities/scores': { scores: [] }, '/api/utilities/recent': { utilities: [] },
            '/api/readings/recent': { items: [] }, '/api/activity': { items: [], counts: { samples: 0, reports: 0, chapters: 0, donations: 0 } },
            '/api/auth/me': { user: null } })[url.pathname];
          if (body === undefined) { status = 503; body = { error: 'Unconfigured fixture endpoint' }; }
        }
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? body : { error: 'Injected unavailable read' }) });
      });
      // One case deliberately loses the outline; other cases load the app's public backdrop.
      if (state.geographyFailure) await context.route('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json', route => route.fulfill({ status: 503, body: 'Fixture backdrop unavailable' }));
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base.href + '#map', { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Water utilities across America' }).waitFor();
        await verify(page, state);
        if (state.geographyFailure) await page.getByRole('button', { name: 'Retry map background' }).waitFor();
        else await page.locator('.rsm-geography').first().waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.deepEqual(errors, []); assert.deepEqual(nonGets, []);
        await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
        report.cases.push({ name, status: 'passed', viewport: width, markers: await page.getByTestId('utility-map-marker').count(),
          requests, browserErrors: errors, zeroWrites: nonGets.length === 0, backdrop: state.geographyFailure ? '503 injected; list and markers survive' : 'Public us-atlas states loaded' });
      } catch (error) {
        await page.screenshot({ path: path.join(output, `${name}-failure.png`), fullPage: true }).catch(() => {});
        report.cases.push({ name, status: 'failed', error: error.message, browserErrors: errors, requests });
      } finally { await context.close(); save(); }
    }
    const markerCount = async (page, count) => page.waitForFunction(expected => document.querySelectorAll('[data-testid="utility-map-marker"]').length === expected, count);
    await run('desktop-sample-failure', 1440, { assessmentFailure: true, detailFailure: true, geographyFailure: true }, async (page, state) => {
      await markerCount(page, 2);
      await page.getByRole('button', { name: 'Retry comparisons', exact: true }).waitFor();
      assert.equal(await page.getByText('Fixture outside US projection', { exact: true }).count(), 1);
      assert.equal(await page.getByText('Within guidelines', { exact: true }).count(), 0);
      assert.equal(await page.locator('[data-assessment="unavailable"]').count(), 2);
      await page.getByTestId('utility-map-marker').first().press('Enter');
      await page.getByRole('button', { name: 'Retry utility records' }).waitFor();
      state.detailFailure = false;
      await page.getByRole('button', { name: 'Retry utility records' }).click();
      await page.getByRole('button', { name: 'Close', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      state.assessmentFailure = false;
      await page.getByRole('button', { name: 'Retry comparisons' }).click();
      await page.getByText(/Historical sample records are available/).waitFor();
      await markerCount(page, 2);
      assert.equal(await page.locator('[data-assessment="not_assessed"]').count(), 2);
    });
    await run('mobile-legacy-locations', 390, {}, async page => {
      await markerCount(page, 2);
      await page.getByText(/Historical sample records are available/).waitFor();
      assert.equal(await page.getByText('Within guidelines', { exact: true }).count(), 0);
      assert.equal(await page.locator('[data-assessment="not_assessed"]').count(), 2);
    });
    await run('location-failure-retry', 1440, { locationFailure: true }, async (page, state) => {
      await page.getByRole('button', { name: 'Retry locations', exact: true }).waitFor();
      assert.equal(await page.getByTestId('utility-map-marker').count(), 0);
      assert.equal(await page.getByText(/No utility locations with usable coordinates/).count(), 0);
      state.locationFailure = false;
      await page.getByRole('button', { name: 'Retry locations', exact: true }).click();
      await markerCount(page, 2);
    });
    await run('partial-comparisons-filters', 1440, { mode: 'mixed' }, async page => {
      await markerCount(page, 2);
      await page.getByRole('button', { name: /^Above legal limit/ }).click();
      await markerCount(page, 1);
      assert.equal(await page.getByTestId('utility-map-marker').getAttribute('data-assessment'), 'legal');
      await page.getByRole('button', { name: 'Clear all filters' }).click();
      await markerCount(page, 2);
      await page.getByRole('button', { name: /^Not assessed/ }).click();
      await markerCount(page, 1);
    });
    await run('nearby-failure-retry', 390, { radiusFailure: true }, async (page, state) => {
      await markerCount(page, 2);
      await page.getByRole('button', { name: 'Chicago, IL', exact: true }).click();
      await page.getByRole('button', { name: 'Retry nearby search' }).waitFor();
      assert.equal(await page.getByTestId('utility-map-marker').count(), 2);
      state.radiusFailure = false;
      await page.getByRole('button', { name: 'Retry nearby search' }).click();
      await markerCount(page, 1);
    });
    report.status = report.cases.every(value => value.status === 'passed') ? 'passed' : 'failed';
    save();
    console.log(JSON.stringify({ status: report.status, cases: report.cases.map(({ name, status, error, markers }) => ({ name, status, error, markers })) }));
    if (report.status === 'failed') process.exitCode = 1;
  } finally {
    try { if (browser) await browser.close(); }
    finally {
      if (oldTemp === undefined) delete process.env.TEMP; else process.env.TEMP = oldTemp;
      if (oldTmp === undefined) delete process.env.TMP; else process.env.TMP = oldTmp;
      fs.rmSync(contained(output, scratch), { recursive: true, force: true, maxRetries: 2 });
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
