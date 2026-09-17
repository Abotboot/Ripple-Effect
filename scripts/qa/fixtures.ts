// Typed test fixtures for Contaminant and Sample models.
// All values are synthetic software-test inputs, not measured concentrations.
import type { Contaminant, Sample } from '@prisma/client';
const fixed = new Date('2024-01-01T00:00:00.000Z');

export function fixtureContaminant(overrides: Partial<Contaminant> = {}): Contaminant {
  return {
    id: 'fixture-contaminant', slug: 'fixture', name: 'Fixture contaminant',
    chemicalName: null, category: 'Other',
    legalLimit: 10, legalLimitUnit: 'ppb',
    healthGuideline: 5, healthGuidelineUnit: 'ppb', ewgHealthLimit: null,
    description: null, healthEffects: null, sources: null,
    regulated: false, trackedByUs: false, rarityNote: null,
    createdAt: fixed, updatedAt: fixed, ...overrides,
  };
}

export function fixtureSample(overrides: Partial<Sample> = {}): Sample {
  return {
    id: 'fixture-sample', utilityId: 'fixture-utility',
    contaminantId: 'fixture-contaminant', level: 1, unit: 'ppb', sampleDate: fixed,
    source: 'Synthetic test fixture', robot: false, treatmentStatus: 'Treated',
    location: null, quality: 'unreviewed', provenance: 'UNKNOWN',
    verificationStatus: 'UNREVIEWED', sourceUrl: null, sourceRecordId: null,
    reportingPeriod: null, method: null, verifiedAt: null,
    notes: null, createdAt: fixed, ...overrides,
  };
}
