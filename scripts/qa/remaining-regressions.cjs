'use strict';
/** Copy into scripts/qa/remaining-regressions.cjs; run with the project's tsx.
 * Uses only synthetic fixtures and a stubbed Prisma client. No DB connection.
 * These are acceptance tests expected to expose current commit 380cdca's defects.
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fixtureContaminant, fixtureSample } = require('./fixtures.ts');
const { buildContaminantSummary } = require('../../src/lib/aggregate.ts');
const { buildWaterReportCardViewModel } = require('../../src/lib/water-report-card.ts');
const { normalizeToBenchmarkUnit, areUnitsCompatible } = require('../../src/lib/provenance.ts');

const verified = { provenance: 'LAB_REPORTED', verificationStatus: 'VERIFIED', quality: 'verified', source: 'QA fixture only' };
const utility = {
  id: 'fixture-utility', pwsid: 'QA-ONLY', name: 'Example QA System', city: 'Fictional Town', state: 'XX',
  zipCodes: '00000', county: null, population: 0, systemType: 'Community', sourceType: 'Surface',
  treatmentStatus: 'Treated', latitude: 0, longitude: 0, website: null, notes: null,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
};
function reportFor(contaminant, sample) {
  const summary = buildContaminantSummary(contaminant, [sample]);
  return buildWaterReportCardViewModel({ ...utility, totalSamples: 1, exceedances: 0, healthExceedances: 0, contaminantSummaries: [summary] });
}
function assertNotAssessed(vm) {
  assert.equal(vm.legalStatusText, 'Not Assessed');
  assert.equal(vm.legalCardTone, 'neutral');
  assert.equal(vm.healthExceedancesText, 'N/A');
  assert.equal(vm.hasAssessedVerifiedData, false);
  assert.doesNotMatch(vm.shareText, /no (?:health guideline )?exceedances|no violations|clean bill|within legal limits/i);
}

test('verified measurement without benchmarks is not an assessed report', () => {
  const vm = reportFor(fixtureContaminant({ legalLimit: null, healthGuideline: null }), fixtureSample(verified));
  assertNotAssessed(vm);
  assert.equal(vm.keyFindings[0].statusText, 'NO BENCHMARK AVAILABLE');
  assert.equal(vm.keyFindings[0].dotColor, '#94a3b8');
  assert.equal(vm.keyFindings[0].textColor, '#94a3b8');
  assert.match(vm.keyFindings[0].statusText, /benchmark/i);
  assert.doesNotMatch(vm.keyFindings[0].statusText, /unreviewed/i);
  assert.match(vm.shareText, /0 benchmarks assessed/i);
});

test('verified measurement with incompatible benchmark units remains neutral', () => {
  const vm = reportFor(fixtureContaminant(), fixtureSample({ ...verified, unit: 'particles/l' }));
  assertNotAssessed(vm);
  assert.equal(vm.keyFindings[0].statusText, 'UNIT MISMATCH');
  assert.equal(vm.keyFindings[0].dotColor, '#94a3b8');
  assert.equal(vm.keyFindings[0].textColor, '#94a3b8');
  assert.doesNotMatch(vm.keyFindings[0].statusText, /unreviewed/i);
  assert.match(vm.shareText, /0 benchmarks assessed/i);
});

test('partially assessable utility preserves independent legal and health comparison subsets', () => {
  // Contaminant A has legal limit only; Contaminant B has health guideline only
  const contamA = fixtureContaminant({ id: 'c-a', name: 'Contam A', legalLimit: 10, legalLimitUnit: 'ppb', healthGuideline: null });
  const contamB = fixtureContaminant({ id: 'c-b', name: 'Contam B', legalLimit: null, healthGuideline: 5, healthGuidelineUnit: 'ppb' });
  const sampleA = fixtureSample({ ...verified, contaminantId: 'c-a', level: 15, unit: 'ppb' });
  const sampleB = fixtureSample({ ...verified, contaminantId: 'c-b', level: 2, unit: 'ppb' });

  const summaryA = buildContaminantSummary(contamA, [sampleA]);
  const summaryB = buildContaminantSummary(contamB, [sampleB]);
  const vm = buildWaterReportCardViewModel({
    ...utility,
    totalSamples: 2,
    contaminantSummaries: [summaryA, summaryB]
  });

  assert.equal(vm.hasAssessedVerifiedData, true);
  assert.equal(vm.legalStatusText, '1 above / 1 assessed');
  assert.equal(vm.legalCardTone, 'rose');
  assert.equal(vm.legalSublabel, '1 not assessed');
  assert.equal(vm.healthExceedancesText, '0 above / 1 assessed');
  assert.equal(vm.healthCardTone, 'neutral');
  assert.equal(vm.healthSublabel, '1 not assessed');
});
for (const [from, to, expected] of [
  ['particles/ml','particles/l',1000], ['particles/100ml','particles/l',10],
  ['particles/l','particles/ml',0.001], ['particles/liter','particles/l',1],
  ['fibers/ml','fibers/l',1000], ['ppb','ug/l',1], ['ppm','ppt',1000000],
]) {
  test(`explicit conversion: 1 ${from} -> ${to}`, () => {
    assert.equal(normalizeToBenchmarkUnit(1, from, to), expected);
  });
}
for (const from of ['particles/kg','particles/m2','fibers/l']) {
  test(`reject conversion ${from} -> particles/l`, () => {
    assert.equal(areUnitsCompatible(from, 'particles/l'), false);
    assert.equal(normalizeToBenchmarkUnit(1, from, 'particles/l'), null);
  });
}

test('actual stats GET normalizes eligible concentrations before averaging', async () => {
  // Install the mock before importing the application database module.
  const dbModule = require.resolve('../../src/lib/db.ts');
  assert.equal(require.cache[dbModule], undefined, 'Run this suite in an isolated process');
  const writes = [];
  const raw = [fixtureSample({ ...verified, level: 1, unit: 'particles/ml', contaminant: {
    slug: 'microplastics', healthGuideline: null, legalLimit: null, healthGuidelineUnit: null, legalLimitUnit: null,
  } })];
  function project(row, select) {
    if (!select) return row;
    return Object.fromEntries(Object.entries(select).filter(([, val]) => val).map(([key, val]) => [
      key, val === true ? row[key] : project(row[key], val.select),
    ]));
  }
  const mock = new Proxy({}, { get(_target, model) {
    return new Proxy({}, { get(_model, op) {
      return async (args) => {
        if (/create|update|delete|upsert|execute/i.test(String(op))) {
          writes.push(`${String(model)}.${String(op)}`);
          throw new Error('Database writes prohibited in this test');
        }
        if (op === 'count') return ['sample','utility','contaminant'].includes(model) ? 1 : 0;
        if (op === 'findMany') {
          const rows = model === 'sample' ? raw : model === 'utility' ? [utility] : [];
          return rows.map(row => project(row, args?.select));
        }
        throw new Error(`Unexpected mock operation: ${String(model)}.${String(op)}`);
      };
    } });
  } });
  const previousPrisma = globalThis.prisma;
  globalThis.prisma = mock;
  try {
    const { GET } = require('../../src/app/api/stats/route.ts');
    const response = await GET();
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.microplasticsAvg, 1000, 'Must normalize 1 particle/mL to 1000 particles/L');
    assert.equal(data.microplasticsCohortCount, 1);
    assert.deepEqual(writes, []);
  } finally {
    globalThis.prisma = previousPrisma;
  }
});
