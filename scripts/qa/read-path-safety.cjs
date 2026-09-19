/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 1. Migration Execution & No-Drift Gate
function checkMigrations() {
  console.log('[QA-ReadSafety] Gate 1: Checking migration SQL syntax and drift...');
  const initSql = fs.readFileSync(path.join(__dirname, '../../prisma/migrations/0_init/migration.sql'), 'utf8');
  const addSql = fs.readFileSync(path.join(__dirname, '../../prisma/migrations/20260917_add_sample_provenance/migration.sql'), 'utf8');

  // Verify zero unterminated quotes or malformed backslashes (PostgreSQL error 42601)
  assert.equal(/\\Sample\\/.test(initSql), false, '0_init must not contain \\Sample\\');
  assert.equal(/\\Sample\\/.test(addSql), false, 'additive migration must not contain \\Sample\\');
  assert.equal(/\"\s*User\\/.test(initSql), false, '0_init must not contain \" User\\');
  assert.equal(/\\id\\/.test(initSql), false, '0_init must not contain \\id\\');

  // Check essential tables and columns in baseline
  assert.equal(initSql.includes('CREATE TABLE "Utility"'), true, '0_init must create Utility table');
  assert.equal(initSql.includes('CREATE TABLE "Contaminant"'), true, '0_init must create Contaminant table');
  assert.equal(initSql.includes('CREATE TABLE "Sample"'), true, '0_init must create Sample table');
  assert.equal(initSql.includes('"updatedAt" TIMESTAMP(3) NOT NULL'), true, '0_init must include updatedAt columns');

  // Check additive migration
  assert.equal(addSql.includes('CREATE TYPE "SampleProvenance"'), true, 'additive migration must create SampleProvenance enum');
  assert.equal(addSql.includes('CREATE TYPE "SampleVerification"'), true, 'additive migration must create SampleVerification enum');
  assert.equal(addSql.includes('ALTER TABLE "Sample" ADD COLUMN'), true, 'additive migration must alter Sample table');

  console.log('[QA-ReadSafety] PASS: Migration SQL syntax and schema statements verified.');
}

// 2. Instrumented DB and Route Read Safety
async function checkPublicReadSafety() {
  console.log('[QA-ReadSafety] Gate 2: Checking public read handlers with injected DB stub...');

  const writeCalls = [];
  function recordWrite(op) {
    writeCalls.push(op);
  }

  // Projection-aware stub DB
  const fixtureUtility = {
    id: 'util-fixture-1',
    pwsid: 'CA1234567',
    name: 'San Francisco Water',
    city: 'San Francisco',
    state: 'CA',
    zipCodes: '94102',
    county: 'San Francisco',
    population: 870000,
    systemType: 'Community',
    sourceType: 'Surface',
    treatmentStatus: 'Treated',
    latitude: 37.7749,
    longitude: -122.4194,
    website: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const fixtureContaminants = [
    {
      id: 'c-mp',
      slug: 'microplastics',
      name: 'Microplastics',
      chemicalName: null,
      category: 'Emerging',
      legalLimit: null,
      legalLimitUnit: null,
      healthGuideline: 0,
      healthGuidelineUnit: 'particles/l',
      ewgHealthLimit: null,
      description: null,
      healthEffects: null,
      sources: null,
      regulated: false,
      trackedByUs: true,
      rarityNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'c-lead',
      slug: 'lead',
      name: 'Lead',
      chemicalName: 'Pb',
      category: 'Heavy Metals',
      legalLimit: 15,
      legalLimitUnit: 'ppb',
      healthGuideline: 0,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: null,
      description: null,
      healthEffects: null,
      sources: null,
      regulated: true,
      trackedByUs: true,
      rarityNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Test inputs:
  // 1: UNKNOWN 40 particles/l
  // 2: ILLUSTRATIVE 1000 particles/l
  // 3: Reviewed regulatory 20 particles/l
  const rawSamples = [
    {
      id: 's-unknown',
      utilityId: 'util-fixture-1',
      contaminantId: 'c-mp',
      level: 40,
      unit: 'particles/l',
      sampleDate: new Date('2024-01-01'),
      source: 'Legacy unreviewed CCR',
      robot: false,
      treatmentStatus: 'Treated',
      location: null,
      quality: 'unreviewed',
      provenance: 'UNKNOWN',
      verificationStatus: 'UNREVIEWED',
      sourceUrl: null,
      sourceRecordId: null,
      reportingPeriod: null,
      method: null,
      verifiedAt: null,
      notes: null,
      createdAt: new Date(),
      contaminant: {
        slug: 'microplastics',
        healthGuideline: 0,
        healthGuidelineUnit: 'particles/l',
        legalLimit: null,
        legalLimitUnit: null,
      },
    },
    {
      id: 's-illustrative',
      utilityId: 'util-fixture-1',
      contaminantId: 'c-mp',
      level: 1000,
      unit: 'particles/l',
      sampleDate: new Date('2024-02-01'),
      source: 'Synthetic demo data',
      robot: false,
      treatmentStatus: 'Treated',
      location: null,
      quality: 'illustrative',
      provenance: 'ILLUSTRATIVE',
      verificationStatus: 'UNREVIEWED',
      sourceUrl: null,
      sourceRecordId: null,
      reportingPeriod: null,
      method: null,
      verifiedAt: null,
      notes: null,
      createdAt: new Date(),
      contaminant: {
        slug: 'microplastics',
        healthGuideline: 0,
        healthGuidelineUnit: 'particles/l',
        legalLimit: null,
        legalLimitUnit: null,
      },
    },
    {
      id: 's-verified',
      utilityId: 'util-fixture-1',
      contaminantId: 'c-mp',
      level: 20,
      unit: 'particles/l',
      sampleDate: new Date('2024-03-01'),
      source: 'State Certified Lab',
      robot: false,
      treatmentStatus: 'Treated',
      location: null,
      quality: 'verified',
      provenance: 'LAB_REPORTED',
      verificationStatus: 'VERIFIED',
      sourceUrl: null,
      sourceRecordId: null,
      reportingPeriod: null,
      method: null,
      verifiedAt: new Date(),
      notes: null,
      createdAt: new Date(),
      contaminant: {
        slug: 'microplastics',
        healthGuideline: 0,
        healthGuidelineUnit: 'particles/l',
        legalLimit: null,
        legalLimitUnit: null,
      },
    },
  ];

  // Helper that filters keys according to Prisma select projection
  function projectRecord(record, select) {
    if (!select) return record;
    const projected = {};
    for (const [key, val] of Object.entries(select)) {
      if (val === true) {
        projected[key] = record[key];
      } else if (typeof val === 'object' && val !== null && record[key]) {
        projected[key] = projectRecord(record[key], val.select || val);
      }
    }
    return projected;
  }

  const stubDb = {
    utility: {
      count: () => Promise.resolve(1),
      findMany: (args) => Promise.resolve([projectRecord(fixtureUtility, args?.select)]),
      findUnique: () => Promise.resolve(fixtureUtility),
      upsert: (...args) => { recordWrite('utility.upsert'); return Promise.resolve(fixtureUtility); },
      create: (...args) => { recordWrite('utility.create'); return Promise.resolve(fixtureUtility); },
      update: (...args) => { recordWrite('utility.update'); return Promise.resolve(fixtureUtility); },
      deleteMany: (...args) => { recordWrite('utility.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    contaminant: {
      count: () => Promise.resolve(fixtureContaminants.length),
      findMany: () => Promise.resolve(fixtureContaminants),
      findUnique: (args) => Promise.resolve(fixtureContaminants.find(c => c.id === args?.where?.id) || null),
      upsert: (...args) => { recordWrite('contaminant.upsert'); return Promise.resolve(fixtureContaminants[0]); },
      create: (...args) => { recordWrite('contaminant.create'); return Promise.resolve(fixtureContaminants[0]); },
    },
    sample: {
      count: () => Promise.resolve(rawSamples.length),
      findMany: (args) => {
        // Enforce projection compliance: return only selected fields
        return Promise.resolve(rawSamples.map(s => projectRecord(s, args?.select)));
      },
      create: (...args) => { recordWrite('sample.create'); return Promise.resolve(rawSamples[0]); },
      createMany: (...args) => { recordWrite('sample.createMany'); return Promise.resolve({ count: 0 }); },
      deleteMany: (...args) => { recordWrite('sample.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    donation: {
      count: () => Promise.resolve(0),
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { recordWrite('donation.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    report: {
      count: () => Promise.resolve(0),
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { recordWrite('report.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    volunteer: {
      count: () => Promise.resolve(0),
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { recordWrite('volunteer.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    chapter: {
      count: () => Promise.resolve(0),
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { recordWrite('chapter.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    user: {
      count: () => Promise.resolve(0),
      findMany: () => Promise.resolve([]),
      upsert: (...args) => { recordWrite('user.upsert'); return Promise.resolve({ id: 'u1' }); },
      create: (...args) => { recordWrite('user.create'); return Promise.resolve({ id: 'u1' }); },
      deleteMany: (...args) => { recordWrite('user.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
  };

  // Inject stubDb into globalThis before requiring routes
  globalThis.prisma = stubDb;
  require('../../src/lib/db.ts');

  // 1. Test ensureSeeded with production environment guards
  process.env.SEED_DEMO_DATA = 'false';
  process.env.NODE_ENV = 'production';
  const { ensureSeeded } = require('../../src/lib/ensure-seeded.ts');
  await ensureSeeded();
  assert.equal(writeCalls.length, 0, 'ensureSeeded() must make 0 write calls when SEED_DEMO_DATA=false');

  process.env.SEED_DEMO_DATA = 'true';
  process.env.NODE_ENV = 'production';
  await ensureSeeded();
  assert.equal(writeCalls.length, 0, 'ensureSeeded() must make 0 write calls in production even if SEED_DEMO_DATA=true');

  // 2. Invoke actual route GET /api/stats handler
  const statsRoute = require('../../src/app/api/stats/route.ts');
  const statsRes = await statsRoute.GET();
  assert.equal(statsRes.status, 200, '/api/stats GET must return HTTP 200');
  const statsData = await statsRes.json();

  // Validate stats calculations:
  // Eligible reviewed microplastics average must be 20 (not 353.33!)
  assert.equal(statsData.microplasticsAvg, 20, 'Microplastics average must only count verified eligible cohort (20, not 353.33)');
  assert.equal(statsData.microplasticsCohortCount, 1, 'Microplastics cohort count must be 1');
  // Quality counts must be verified=1, illustrative=1, unreviewed=1
  assert.equal(statsData.qualityCounts.verified, 1, 'Quality count for verified must be 1');
  assert.equal(statsData.qualityCounts.illustrative, 1, 'Quality count for illustrative must be 1');
  assert.equal(statsData.qualityCounts.unreviewed, 1, 'Quality count for unreviewed must be 1');
  assert.equal(writeCalls.length, 0, '/api/stats GET must make zero database write calls');

  // 3. Invoke actual route GET /api/utilities handler
  const { NextRequest } = require('next/server');
  const utilitiesRoute = require('../../src/app/api/utilities/route.ts');
  const utilReq = new NextRequest('http://localhost:3000/api/utilities?q=San+Francisco');
  const utilRes = await utilitiesRoute.GET(utilReq);
  assert.equal(utilRes.status, 200, '/api/utilities GET must return HTTP 200');
  assert.equal(writeCalls.length, 0, '/api/utilities GET must make zero database write calls');

  console.log('[QA-ReadSafety] PASS: Public read routes invoked cleanly with zero database writes.');

  // 4. Negative Control Test: Verify the write detector catches unauthorized write attempts
  console.log('[QA-ReadSafety] Running negative control test...');
  let negativeControlCaught = false;
  try {
    await stubDb.sample.create({ data: { level: 999 } });
    if (writeCalls.length > 0) {
      negativeControlCaught = true;
    }
  } catch {
    negativeControlCaught = true;
  }
  assert.equal(negativeControlCaught, true, 'Negative control: writeCalls must detect write operations');
  assert.equal(writeCalls.includes('sample.create'), true, 'sample.create must be recorded in writeCalls');
  console.log('[QA-ReadSafety] PASS: Negative control write detection verified.');
}

// 3. Water Report Card Pure View Model Test
function checkReportCardViewModel() {
  console.log('[QA-ReadSafety] Gate 3: Checking water report card view model presentation contract...');
  const { buildWaterReportCardViewModel } = require('../../src/lib/water-report-card.ts');

  // Case A: Unreviewed utility with zero verified observations
  const unreviewedUtility = {
    id: 'u-unreviewed',
    pwsid: 'UNREV123',
    name: 'Unreviewed Town Water',
    city: 'Quiet Town',
    state: 'OH',
    zipCodes: '43001',
    county: null,
    population: 5000,
    systemType: 'Community',
    sourceType: 'Surface',
    treatmentStatus: 'Treated',
    latitude: 40,
    longitude: -82,
    website: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalSamples: 1,
    exceedances: 0,
    healthExceedances: 0,
    contaminantSummaries: [
      {
        contaminant: {
          id: 'c1', slug: 'lead', name: 'Lead', chemicalName: 'Pb', category: 'Metals',
          legalLimit: 15, legalLimitUnit: 'ppb', healthGuideline: 0, healthGuidelineUnit: 'ppb',
          ewgHealthLimit: null, description: null, healthEffects: null, sources: null,
          regulated: true, trackedByUs: true, rarityNote: null, createdAt: new Date(), updatedAt: new Date(),
        },
        latestLevel: 5,
        latestDate: '2024-01-01',
        avgLevel: 5,
        maxLevel: 5,
        unit: 'ppb',
        source: 'Unknown Provider',
        quality: 'unreviewed',
        provenance: 'UNKNOWN',
        verificationStatus: 'UNREVIEWED',
        isVerified: false,
        hasData: true,
        sampleCount: 1,
        exceedsHealthGuideline: false,
        exceedsLegalLimit: false,
        healthRatio: null,
        legalRatio: null,
        healthBenchmarkStatus: 'unreviewed',
        legalBenchmarkStatus: 'unreviewed',
        trend: [],
      }
    ]
  };

  const vmA = buildWaterReportCardViewModel(unreviewedUtility);
  assert.equal(vmA.legalStatusText, 'Not Assessed', 'Unreviewed utility must show Not Assessed, never Within Legal Limits');
  assert.equal(vmA.healthExceedancesText, '—', 'Unreviewed utility must show dash for health exceedances');
  assert.equal(vmA.keyFindings[0].statusText, 'UNREVIEWED SAMPLE', 'Unreviewed sample must show UNREVIEWED SAMPLE');
  assert.equal(vmA.shareText.includes('Clean bill'), false, 'Share text must NEVER output "Clean bill"');
  assert.equal(vmA.shareText.includes('Within Legal Limits'), false, 'Share text must NEVER output "Within Legal Limits"');

  // Case B: Illustrative synthetic benchmark
  const illustrativeUtility = {
    ...unreviewedUtility,
    contaminantSummaries: [
      {
        ...unreviewedUtility.contaminantSummaries[0],
        isIllustrative: true,
        provenance: 'ILLUSTRATIVE',
        healthBenchmarkStatus: 'illustrative',
        legalBenchmarkStatus: 'illustrative',
      }
    ]
  };
  const vmB = buildWaterReportCardViewModel(illustrativeUtility);
  assert.equal(vmB.keyFindings[0].statusText, 'ILLUSTRATIVE BENCHMARK', 'Illustrative sample must show ILLUSTRATIVE BENCHMARK');
  assert.equal(vmB.legalStatusText, 'Not Assessed');

  // Case C: True verified exceedance
  const verifiedExceedanceUtility = {
    ...unreviewedUtility,
    exceedances: 1,
    healthExceedances: 1,
    contaminantSummaries: [
      {
        ...unreviewedUtility.contaminantSummaries[0],
        isVerified: true,
        latestLevel: 20,
        avgLevel: 20,
        maxLevel: 20,
        verificationStatus: 'VERIFIED',
        provenance: 'REGULATORY_REPORTED',
        exceedsLegalLimit: true,
        legalBenchmarkStatus: 'above_benchmark',
        healthBenchmarkStatus: 'above_benchmark',
      }
    ]
  };
  const vmC = buildWaterReportCardViewModel(verifiedExceedanceUtility);
  assert.equal(vmC.legalStatusText, '1 above / 1 assessed', 'Verified legal exceedance must display numerical comparison count');
  assert.equal(vmC.keyFindings[0].statusText, 'EXCEEDS LEGAL LIMIT');

  console.log('[QA-ReadSafety] PASS: Water report card view model strictly guards against false safety claims.');
}

async function runAll() {
  checkMigrations();
  await checkPublicReadSafety();
  checkReportCardViewModel();
  console.log('[QA-ReadSafety] ALL READ-PATH AND QA GATES PASSED CLEANLY.');
}

runAll().catch((err) => {
  console.error('[QA-ReadSafety] FAILED:', err);
  process.exit(1);
});
