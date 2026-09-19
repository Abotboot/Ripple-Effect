/* eslint-disable @typescript-eslint/no-require-imports -- Fixture-only Node route verification. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createJiti } = require('jiti');
const root = path.resolve(__dirname, '../../../..');
const jiti = createJiti(__filename, { alias: { '@': path.join(root, 'src') }, tryNative: false, fsCache: false });
const { NextRequest } = require('next/server');
const { fixtureContaminant, fixtureSample } = jiti(path.join(root, 'scripts/qa/fixtures.ts'));
const fixed = new Date('2024-01-01T00:00:00Z');
const metadata = ['provenance', 'verificationStatus', 'sourceUrl', 'sourceRecordId', 'reportingPeriod', 'method', 'verifiedAt'];
const writes = [];
let calls = [];
let state;
const offline = Object.assign(new Error('Fixture connection failure'), { code: 'P1001' });
const legacyError = Object.assign(new Error('Fixture missing column'), { code: 'P2022', meta: { modelName: 'Sample', column: 'Sample.provenance' } });
const baseUtility = { id: 'u1', pwsid: 'QA-ONLY-1', name: 'Fixture utility one', city: 'Fixture town', state: 'IL',
  zipCodes: '00000', county: null, population: 10, systemType: 'Community', sourceType: 'Surface', treatmentStatus: 'Treated',
  latitude: 41.88, longitude: -87.63, website: null, notes: null, createdAt: fixed, updatedAt: fixed };
const mp = fixtureContaminant({ id: 'mp', slug: 'microplastics', legalLimit: null, healthGuideline: null,
  legalLimitUnit: 'particles/l', healthGuidelineUnit: 'particles/l' });
const lead = fixtureContaminant({ id: 'lead', slug: 'lead' });
const verified = { quality: 'verified', provenance: 'LAB_REPORTED', verificationStatus: 'VERIFIED', source: 'Fixture laboratory', sourceUrl: 'https://example.invalid/fixture' };
function sample(overrides = {}) { return fixtureSample({ id: 's1', utilityId: 'u1', contaminantId: 'mp', unit: 'particles/l', ...overrides }); }
function reset(overrides = {}) {
  calls = [];
  state = { mode: 'modern', utilities: [baseUtility, { ...baseUtility, id: 'u2', name: 'Fixture utility two', longitude: -74, latitude: 40.7 }],
    contaminants: [mp, lead], samples: [sample()], ...overrides };
}
function hasMetadata(select) {
  if (!select) return true;
  return Object.entries(select).some(([key, value]) => (metadata.includes(key) && value === true) ||
    (value && typeof value === 'object' && value.select && hasMetadata(value.select)));
}
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some(clause => matches(row, clause));
    if (value && typeof value === 'object') {
      if ('in' in value) return value.in.includes(row[key]);
      if ('not' in value) return row[key] !== value.not;
      if ('equals' in value) return row[key] === value.equals;
    }
    return row[key] === value;
  });
}
function project(row, select) {
  if (row == null) return row;
  if (Array.isArray(row)) return row.map(value => project(value, select));
  if (!select) return row;
  return Object.fromEntries(Object.entries(select).filter(([, value]) => value).map(([key, value]) =>
    [key, value === true ? row[key] : project(row[key], value.select)]));
}
function table(model) {
  if (model === 'sample') return state.samples.map(s => ({ ...s,
    utility: state.utilities.find(u => u.id === s.utilityId) ?? null,
    contaminant: state.contaminants.find(c => c.id === s.contaminantId) }));
  if (model === 'utility') return state.utilities;
  if (model === 'contaminant') return state.contaminants;
  return [];
}
const mock = new Proxy({}, { get(_target, model) {
  if (String(model).startsWith('$')) return () => { writes.push(String(model)); throw Error('Raw/transaction operations prohibited in fixture QA'); };
  return new Proxy({}, { get(_targetModel, operation) {
    return async (args = {}) => {
      calls.push({ model, operation, args });
      if (!['findMany', 'findUnique', 'count'].includes(operation)) { writes.push(`${String(model)}.${String(operation)}`); throw Error('Database write or unexpected operation'); }
      if (state.failModel === model) throw offline;
      if (model === 'sample' && operation === 'findMany') {
        if (state.mode === 'offline') throw offline;
        if (state.mode === 'missing_old') throw Object.assign(new Error('Fixture absent old column'), { code: 'P2022', meta: { modelName: 'Sample', column: 'Sample.level' } });
        if (['legacy', 'legacy_then_offline'].includes(state.mode) && hasMetadata(args.select)) throw legacyError;
        if (state.mode === 'legacy_then_offline') throw offline;
      }
      let rows = table(model).filter(row => matches(row, args.where));
      if (operation === 'count') return rows.length;
      if (operation === 'findUnique') return project(rows[0] ?? null, args.select);
      for (const order of [args.orderBy].flat().filter(Boolean).reverse()) {
        const [key, direction] = Object.entries(order)[0];
        rows.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (direction === 'desc' ? -1 : 1));
      }
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take != null) rows = rows.slice(0, args.take);
      return rows.map(row => project(row, args.select));
    };
  } });
} });
globalThis.prisma = mock;
const { readSamples, SAMPLE_READ_FIELDS, isMissingSampleMetadataColumn } = jiti(path.join(root, 'src/lib/sample-read.ts'));
const { isEligibleForScoring } = jiti(path.join(root, 'src/lib/provenance.ts'));
const { hasFiniteCoordinates, assessmentKind } = jiti(path.join(root, 'src/lib/sample-read-model.ts'));
const { reviewedConcentration, summarizeReviewedConcentrations } = jiti(path.join(root, 'src/lib/sample-read-cohort.ts'));
const routes = Object.fromEntries(['stats', 'utilities/scores', 'utilities/[id]', 'samples', 'export', 'utilities/compare',
  'contaminants/[id]', 'microplastics/trend', 'readings/recent', 'activity', 'dashboard'].map(name => [name, jiti(path.join(root, `src/app/api/${name}/route.ts`))]));
const request = url => new NextRequest(`http://localhost${url}`);
const invoke = (route, query = '', id) => routes[route].GET(request(`/api/${route.replace('[id]', id ?? 'u1')}${query}`), { params: Promise.resolve({ id: id ?? 'u1' }) });
const json = async (route, query = '', id) => { const response = await invoke(route, query, id); return { response, body: await response.json() }; };
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('P2022 guard identifies only known Sample metadata columns, including nested Utility errors', () => {
  for (const column of metadata) {
    for (const modelName of ['Sample', 'Utility']) assert.equal(isMissingSampleMetadataColumn({ code: 'P2022', meta: { modelName, column: `Sample.${column}` } }), true);
  }
  for (const error of [offline, new Error('Sample.provenance missing'), { code: '42703', meta: legacyError.meta },
    { code: 'P2022', meta: { column: 'provenance' } }, { code: 'P2022', meta: { modelName: 'Sample', column: 'Utility.provenance' } },
    { code: 'P2022', meta: { modelName: 'Sample', column: 'Sample.level' } }]) assert.equal(isMissingSampleMetadataColumn(error), false);
});
test('modern reads retain selected real metadata and do not retry', async () => {
  reset({ samples: [sample(verified)] });
  const result = await readSamples(SAMPLE_READ_FIELDS, { where: { utilityId: 'u1' }, take: 1 });
  assert.equal(result.dataStatus.status, 'available'); assert.equal(result.samples[0].sourceUrl, verified.sourceUrl);
  assert.equal(isEligibleForScoring(result.samples[0]), true); assert.equal(calls.length, 1);
});
test('legacy retry preserves filters/order/take/source/date and never trusts historical verified quality', async () => {
  reset({ mode: 'legacy', samples: [sample({ ...verified, notes: 'recorded source note' })] });
  const options = { where: { utilityId: 'u1' }, orderBy: { sampleDate: 'desc' }, take: 7 };
  const result = await readSamples({ ...SAMPLE_READ_FIELDS, contaminant: true }, options);
  assert.equal(calls.length, 2); assert.equal(hasMetadata(calls[1].args.select), false);
  for (const key of Object.keys(options)) assert.deepEqual(calls[1].args[key], options[key]);
  assert.equal(result.samples.length, 1); assert.equal(result.samples[0].quality, 'verified');
  assert.equal(result.samples[0].source, verified.source); assert.equal(result.samples[0].sampleDate.toISOString(), fixed.toISOString());
  assert.equal(result.samples[0].provenance, 'UNKNOWN'); assert.equal(result.samples[0].verificationStatus, 'UNREVIEWED');
  assert.equal(result.samples[0].sourceUrl, null); assert.equal(isEligibleForScoring(result.samples[0]), false);
  assert.equal(result.dataStatus.code, 'legacy_sample_schema');
});
test('connection, non-metadata schema, failed retry and metadata-filter errors propagate', async () => {
  for (const mode of ['offline', 'missing_old', 'legacy_then_offline']) {
    reset({ mode }); await assert.rejects(() => readSamples(SAMPLE_READ_FIELDS));
    assert.equal(calls.length, mode === 'legacy_then_offline' ? 2 : 1);
  }
  reset({ mode: 'legacy' });
  await assert.rejects(() => readSamples(SAMPLE_READ_FIELDS, { where: { verificationStatus: 'VERIFIED' } }), error => error === legacyError);
  assert.equal(calls.length, 1);
});
test('location-only GET survives all sample failures and excludes invalid coordinates', async () => {
  reset({ mode: 'offline', utilities: [baseUtility, { ...baseUtility, id: 'null', latitude: null },
    { ...baseUtility, id: 'inf', longitude: Infinity }, { ...baseUtility, id: 'range', latitude: 91 }, { ...baseUtility, id: 'zero', latitude: 0, longitude: 0 }] });
  const { response, body } = await json('stats', '?view=map');
  assert.equal(response.status, 200); assert.deepEqual(body.mapUtilities.map(u => u.id), ['u1', 'zero']);
  assert.equal(body.unmappedCount, 3); assert.equal(body.mapUtilities[0].assessment.healthAbove, null);
  assert.equal(calls.every(call => call.model === 'utility'), true);
});
test('legacy stats return actual counts/locations and explicitly unassessed comparisons', async () => {
  reset({ mode: 'legacy', samples: [sample(verified), sample({ id: 's2', ...verified })] });
  const { response, body } = await json('stats');
  assert.equal(response.status, 200); assert.equal(body.samplesCount, 2); assert.equal(body.utilitiesCount, 2);
  assert.equal(body.microplasticsAvg, null); assert.equal(body.qualityCounts.verified, 0);
  assert.equal(body.dataStatus.status, 'degraded'); assert.equal(body.sampleAssessment.healthAbove, null);
  assert.equal(body.mapUtilities.length, 2); assert.equal(assessmentKind(body.mapUtilities[0].assessment), 'not_assessed');
});
test('stats normalize eligible treated concentrations and preserve partial independent benchmarks', async () => {
  reset({ samples: [sample({ ...verified, level: 1, unit: 'particles/ml' }), sample({ ...verified, id: 's2', level: 20 }),
    sample({ ...verified, id: 's3', treatmentStatus: 'Untreated', level: 9000 }), sample({ id: 's4', level: 80000 }),
    sample({ ...verified, id: 's5', contaminantId: 'lead', unit: 'ppm', level: 0.007 }),
    sample({ ...verified, id: 's6', contaminantId: 'lead', unit: 'particles/l', level: 900 })] });
  const { body } = await json('stats');
  assert.equal(body.microplasticsAvg, 510); assert.equal(body.microplasticsCohortCount, 2);
  assert.equal(body.sampleAssessment.healthCompared, 1); assert.equal(body.sampleAssessment.healthAbove, 1);
  assert.equal(body.sampleAssessment.legalAbove, 0); assert.equal(body.sampleAssessment.legalCompared, 1);
});
test('stats genuine read errors do not become fabricated empty responses', async () => {
  reset({ mode: 'offline' }); await assert.rejects(() => invoke('stats'), error => error === offline);
  reset({ failModel: 'utility' }); await assert.rejects(() => invoke('stats', '?view=map'), error => error === offline);
});
test('scores include real utilities and null scores under legacy fallback', async () => {
  reset({ mode: 'legacy', samples: [sample(verified)] });
  const { body } = await json('utilities/scores');
  assert.equal(body.scores.length, 2); assert.equal(body.scores[0].sampleCount, 1);
  assert.equal(body.scores.every(score => score.score === null && score.eligibleSampleCount === 0), true);
  assert.equal(body.dataStatus.status, 'degraded');
});
test('utility detail retains historical observations and explicit review state; missing utility is 404', async () => {
  reset({ mode: 'legacy', samples: [sample({ ...verified, contaminantId: 'lead', level: 123, unit: 'ppb' })] });
  const { body } = await json('utilities/[id]');
  assert.equal(body.totalSamples, 1); assert.equal(body.contaminantSummaries[0].source, verified.source);
  assert.equal(body.contaminantSummaries[0].latestLevel, 123); assert.equal(body.contaminantSummaries[0].healthBenchmarkStatus, 'unreviewed');
  assert.equal(body.safetyScore.score, null); assert.equal((await invoke('utilities/[id]', '', 'missing')).status, 404);
});
test('samples retain array shape, privacy sanitization and degraded headers; malformed limits fail before DB', async () => {
  reset({ mode: 'legacy', samples: [sample({ ...verified, notes: 'reporter:private@example.invalid | public note' })] });
  const { response, body } = await json('samples', '?utilityId=u1&limit=1');
  assert.ok(Array.isArray(body)); assert.equal(body.length, 1); assert.doesNotMatch(body[0].notes, /private@/);
  assert.equal(body[0].verificationStatus, 'UNREVIEWED'); assert.equal(response.headers.get('x-ripple-data-status'), 'degraded');
  for (const value of ['NaN', '-1', '1.2', '0']) { calls = []; assert.equal((await invoke('samples', `?limit=${value}`)).status, 400); assert.equal(calls.length, 0); }
});
test('sample exports preserve record source and conservative verification in JSON and CSV', async () => {
  reset({ mode: 'legacy', samples: [sample({ ...verified, source: '=QA formula' })] });
  const { response, body } = await json('export', '?table=samples&format=json');
  assert.equal(body[0].source, '=QA formula'); assert.equal(body[0].verificationStatus, 'UNREVIEWED');
  assert.equal(response.headers.get('x-ripple-data-status'), 'degraded');
  assert.match(await (await invoke('export', '?table=samples&format=csv')).text(), /'=QA formula/);
});
test('comparison selects existing reviewed cohort and never invents a cross-unit winner', async () => {
  reset({ samples: [sample({ ...verified, contaminantId: 'lead', unit: 'ppm', level: 0.007 }),
    sample({ id: 'later', contaminantId: 'lead', unit: 'ppb', level: 999, sampleDate: new Date('2025-01-01') }),
    sample({ id: 'u2s', utilityId: 'u2', contaminantId: 'lead', unit: 'particles/l', level: 20 })] });
  const { body } = await json('utilities/compare', '?ids=u2,u1');
  assert.equal(body.utilities[0].id, 'u2'); assert.equal(body.rows[0].bestUtilityId, null);
  assert.equal(body.rows[0].perUtility[1].level, 0.007); assert.equal(body.rows[0].perUtility[1].unit, 'ppm');
  assert.equal(body.rows[0].perUtility[0].healthBenchmarkStatus, 'unreviewed');
});
test('contaminant detail preserves observations but leaves legacy treatment averages null', async () => {
  reset({ mode: 'legacy', samples: [sample(verified)] });
  const { body } = await json('contaminants/[id]', '', 'mp');
  assert.equal(body.utilityStats[0].latestLevel, 1); assert.equal(body.totals.samples, 1);
  assert.equal(body.totals.avgTreated, null); assert.equal(body.totals.avgUntreated, null); assert.equal(body.totals.maxLevel, null);
  reset({ samples: [sample({ ...verified, level: 0 })] });
  assert.equal((await json('contaminants/[id]', '', 'mp')).body.totals.avgTreated, 0);
});
test('trend excludes unreviewed/incompatible rows, preserves true zero and leaves missing quarters null', async () => {
  reset({ mode: 'legacy', samples: [sample(verified)] });
  const legacy = (await json('microplastics/trend')).body;
  assert.deepEqual(legacy.trend, []); assert.equal(legacy.direction, null); assert.equal(legacy.totalSamples, 1);
  reset({ samples: [sample({ ...verified, level: 1, unit: 'particles/ml' }),
    sample({ ...verified, id: 'q2', level: 0, sampleDate: new Date('2024-04-01') }),
    sample({ id: 'raw', level: 999999 }), sample({ ...verified, id: 'mass', unit: 'ppb', level: 100 })] });
  const body = (await json('microplastics/trend')).body;
  assert.equal(body.reviewedSampleCount, 2); assert.equal(body.trend[0].treatedAvg, 1000);
  assert.equal(body.trend[1].treatedAvg, 0); assert.equal(body.trend[0].untreatedAvg, null);
  assert.equal(body.pctChange, -100);
});
test('recent and activity display legacy observations without a safe or verified assessment', async () => {
  reset({ mode: 'legacy', samples: [sample({ ...verified, quality: 'citizen', contaminantId: 'lead', level: 999, unit: 'ppb' })] });
  const recent = (await json('readings/recent')).body;
  assert.equal(recent.items[0].level, 999); assert.equal(recent.items[0].healthBenchmarkStatus, 'unreviewed');
  const activity = (await json('activity')).body;
  assert.equal(activity.items[0].tone, 'default'); assert.match(activity.items[0].meta, /Citizen science/);
  assert.equal(activity.dataStatus.status, 'degraded');
});
test('coordinate and assessment helpers do not treat missing values as safe', () => {
  for (const latitude of [null, undefined, NaN, Infinity, '41', -91, 91]) assert.equal(hasFiniteCoordinates({ latitude, longitude: 0 }), false);
  assert.equal(hasFiniteCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(assessmentKind(), 'unavailable'); assert.equal(assessmentKind({ status: 'not_assessed', healthCompared: 0, legalCompared: 0 }), 'not_assessed');
});
test('converted concentrations reject overflow and non-finite levels, retaining large finite means', () => {
  for (const level of [Infinity, NaN, -1, Number.MAX_VALUE]) assert.equal(reviewedConcentration(sample({ ...verified, level, unit: 'particles/ml' }), 'particles/l'), null);
  const summary = summarizeReviewedConcentrations([sample({ ...verified, level: 1e308 }), sample({ ...verified, level: 1e308 })], 'particles/l');
  assert.equal(summary.average, 1e308); assert.equal(summary.maximum, 1e308);
});
test('dashboard legacy quality is not promoted and reviewed exceedances use explicit compatible units', async () => {
  reset({ mode: 'legacy', samples: [sample({ ...verified, contaminantId: 'lead', unit: 'ppb', level: 100 })] });
  const legacy = (await json('dashboard')).body;
  assert.equal(legacy.dataStatus.status, 'degraded'); assert.equal(legacy.qualityBreakdown.verified, 0);
  assert.equal(legacy.qualityBreakdown.unreviewed, 1); assert.deepEqual(legacy.topExceedances, []);
  assert.equal(legacy.bestUtility, null); assert.equal(legacy.totalSamples, 1);
  reset({ samples: [sample({ ...verified, contaminantId: 'lead', unit: 'ppm', level: 0.007 }), sample({ ...verified, id: 'wrong', contaminantId: 'lead', unit: 'particles/l', level: 999 })] });
  const modern = (await json('dashboard')).body;
  assert.equal(modern.topExceedances[0].healthCount, 1); assert.equal(modern.topExceedances[0].legalCount, 0);
});

(async () => {
  const results = [];
  for (const { name, run } of tests) {
    try { await run(); results.push({ name, status: 'passed' }); }
    catch (error) { results.push({ name, status: 'failed', error: error.message }); }
  }
  assert.deepEqual(writes, [], 'No database writes/raw operations are allowed');
  const report = { status: results.every(result => result.status === 'passed') ? 'passed' : 'failed',
    database: 'Injected fixture client only; no connection or credentials loaded', zeroWrites: writes.length === 0, tests: results };
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (report.status !== 'passed') process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
