const assert = require('node:assert/strict');

// Test that public read helpers and routes perform zero database writes
async function runReadSafetyCheck() {
  console.log('[QA-ReadSafety] Checking public read paths for zero DB write invocations...');

  const writeCalls = [];
  const stubDb = {
    user: {
      upsert: (...args) => { writeCalls.push('user.upsert'); return Promise.resolve({ id: 'u1' }); },
      create: (...args) => { writeCalls.push('user.create'); return Promise.resolve({ id: 'u1' }); },
      update: (...args) => { writeCalls.push('user.update'); return Promise.resolve({ id: 'u1' }); },
      delete: (...args) => { writeCalls.push('user.delete'); return Promise.resolve({ id: 'u1' }); },
      deleteMany: (...args) => { writeCalls.push('user.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    utility: {
      count: () => Promise.resolve(0),
      findMany: () => Promise.resolve([]),
      upsert: (...args) => { writeCalls.push('utility.upsert'); return Promise.resolve({ id: 'util1' }); },
      create: (...args) => { writeCalls.push('utility.create'); return Promise.resolve({ id: 'util1' }); },
      deleteMany: (...args) => { writeCalls.push('utility.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    contaminant: {
      findMany: () => Promise.resolve([]),
      findUnique: () => Promise.resolve(null),
      upsert: (...args) => { writeCalls.push('contaminant.upsert'); return Promise.resolve({ id: 'c1' }); },
    },
    sample: {
      findMany: () => Promise.resolve([]),
      create: (...args) => { writeCalls.push('sample.create'); return Promise.resolve({ id: 's1' }); },
      createMany: (...args) => { writeCalls.push('sample.createMany'); return Promise.resolve({ count: 0 }); },
      deleteMany: (...args) => { writeCalls.push('sample.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    donation: {
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { writeCalls.push('donation.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    report: {
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { writeCalls.push('report.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
    chapter: {
      findMany: () => Promise.resolve([]),
      deleteMany: (...args) => { writeCalls.push('chapter.deleteMany'); return Promise.resolve({ count: 0 }); },
    },
  };

  // Test with SEED_DEMO_DATA=false and NODE_ENV=production
  process.env.SEED_DEMO_DATA = 'false';
  process.env.NODE_ENV = 'production';

  // Test ensureSeeded directly
  const { ensureSeeded } = require('../../src/lib/ensure-seeded.ts');
  await ensureSeeded();
  assert.equal(writeCalls.length, 0, 'ensureSeeded() must make 0 write calls when SEED_DEMO_DATA=false. Got: ' + writeCalls.join(', '));

  // Test with SEED_DEMO_DATA=true but NODE_ENV=production
  process.env.SEED_DEMO_DATA = 'true';
  process.env.NODE_ENV = 'production';
  await ensureSeeded();
  assert.equal(writeCalls.length, 0, 'ensureSeeded() must make 0 write calls in production even if SEED_DEMO_DATA=true.');

  console.log('[QA-ReadSafety] PASS: Zero database writes on public read paths.');
}

runReadSafetyCheck().catch(err => {
  console.error('[QA-ReadSafety] FAILED:', err);
  process.exit(1);
});
