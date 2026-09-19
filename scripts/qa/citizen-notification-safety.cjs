/* eslint-disable @typescript-eslint/no-require-imports -- Fixture-only actual route regression. */
'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { createJiti } = require('jiti')
const { NextRequest } = require('next/server')

const root = path.resolve(__dirname, '../..')
const qaState = {
  rateLimitCalls: [],
  readingWebhookCalls: [],
  alertWebhookCalls: [],
  dbCalls: [],
  createdData: null,
}
globalThis.__citizenRouteQa = qaState

const contaminant = {
  id: 'qa-contaminant',
  name: 'QA fixture contaminant',
  legalLimit: 15,
  legalLimitUnit: 'ppb',
  healthGuideline: 5,
  healthGuidelineUnit: 'ppb',
}

globalThis.prisma = {
  contaminant: {
    findUnique: async args => {
      qaState.dbCalls.push({ model: 'contaminant', operation: 'findUnique', args })
      return args?.where?.id === contaminant.id ? contaminant : null
    },
  },
  utility: {
    findUnique: async args => {
      qaState.dbCalls.push({ model: 'utility', operation: 'findUnique', args })
      return null
    },
  },
  sample: {
    count: async args => {
      qaState.dbCalls.push({ model: 'sample', operation: 'count', args })
      return 0
    },
    create: async args => {
      qaState.dbCalls.push({ model: 'sample', operation: 'create', args })
      qaState.createdData = args.data
      return { id: 'qa-created-reading', ...args.data }
    },
  },
}

const jiti = createJiti(__filename, {
  alias: {
    '@/lib/discord-webhook': path.join(__dirname, 'mocks/citizen-discord-webhook.cjs'),
    '@/lib/rate-limit': path.join(__dirname, 'mocks/citizen-rate-limit.cjs'),
    '@': path.join(root, 'src'),
  },
  tryNative: false,
  fsCache: false,
})

async function main() {
  const route = jiti(path.join(root, 'src/app/api/readings/route.ts'))
  const body = {
    contaminantId: contaminant.id,
    level: Number.MAX_SAFE_INTEGER,
    unit: 'totally-incompatible-unit',
    reporterName: 'QA fixture reporter',
    reporterEmail: 'qa@example.invalid',
    location: 'Fixture watershed',
    notes: 'Extreme fixture value must remain unreviewed',
  }
  const request = new NextRequest('http://localhost/api/readings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.0.2.25',
    },
    body: JSON.stringify(body),
  })

  const response = await route.POST(request)
  const payload = await response.json()

  assert.equal(response.status, 201)
  assert.equal(payload.ok, true)
  assert.equal(payload.id, 'qa-created-reading')
  assert.equal(qaState.rateLimitCalls.length, 1, 'Actual POST must use the mocked rate limiter once')
  assert.equal(qaState.readingWebhookCalls.length, 1, 'Actual POST should emit one unreviewed queue/receipt notification')
  assert.equal(qaState.alertWebhookCalls.length, 0, 'Extreme unreviewed citizen value must emit zero threshold/safety alerts')

  assert(qaState.createdData, 'Actual POST must invoke the mocked sample.create path')
  assert.equal(qaState.createdData.quality, 'citizen')
  assert.equal(qaState.createdData.source, 'Citizen Test')
  assert.equal('provenance' in qaState.createdData, false, 'Citizen POST must not assign institutional provenance')
  assert.equal('verificationStatus' in qaState.createdData, false, 'Citizen POST must not mark the record verified')
  assert.equal('verifiedAt' in qaState.createdData, false, 'Citizen POST must not add a verification timestamp')
  assert.equal(qaState.createdData.level, Number.MAX_SAFE_INTEGER)
  assert.equal(qaState.createdData.unit, 'totally-incompatible-unit')

  assert.deepEqual(
    qaState.readingWebhookCalls[0],
    {
      contaminantName: contaminant.name,
      level: Number.MAX_SAFE_INTEGER,
      unit: 'totally-incompatible-unit',
      location: 'Fixture watershed',
      reporterName: 'QA fixture reporter',
      utilityName: null,
      notes: 'Extreme fixture value must remain unreviewed',
      reviewState: 'unreviewed',
    },
  )

  console.log('PASS actual POST: extreme unreviewed citizen fixture stays citizen/unverified, queues once, and dispatches zero threshold alerts; all DB/rate-limit/webhook dependencies mocked')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    delete globalThis.__citizenRouteQa
    delete globalThis.prisma
  })
