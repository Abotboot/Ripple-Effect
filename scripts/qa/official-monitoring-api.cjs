/* eslint-disable @typescript-eslint/no-require-imports -- Instrumented read-only API regression. */
const assert = require('node:assert/strict')
const snapshot = require('../../src/data/epa-ucmr5.json')
const chicago = snapshot.utilities.find(u => u.city === 'Chicago')
const utility = { id: 'qa-chicago', name: chicago.directoryName, pwsid: chicago.directoryPwsid,
  state: 'IL', city: 'Chicago', population: 0, latitude: 41.8781, longitude: -87.6298 }
const writes = []
const table = {
  findMany: async () => [], count: async () => 0,
  create: () => { writes.push('create'); throw Error('Unexpected write') },
  update: () => { writes.push('update'); throw Error('Unexpected write') },
  delete: () => { writes.push('delete'); throw Error('Unexpected write') },
}
let lastUtilityQuery
globalThis.prisma = {
  utility: { ...table, findMany: async query => { lastUtilityQuery = query; return [utility] }, findUnique: async () => utility },
  sample: { ...table, findMany: async query => {
    if (query.select?.provenance) throw { code: 'P2022', meta: { modelName: 'Sample', column: 'Sample.provenance' } }
    return []
  } },
  contaminant: table, report: table, volunteer: table, chapter: table, donation: table,
}
;(async () => {
  const request = url => ({ nextUrl: new URL(url, 'https://qa.invalid') })
  const stats = await (await require('../../src/app/api/stats/route').GET()).json()
  assert.equal(stats.mapUtilities[0].pwsid, 'IL0316000')
  assert.equal(stats.mapUtilities[0].assessment.legalCompared, 16)
  assert.equal(stats.mapUtilities[0].assessment.legalAbove, 0)
  assert.equal(stats.officialMonitoring.results, 16)
  assert.equal(stats.dataStatus.code, 'legacy_sample_schema')
  const detailRoute = require('../../src/app/api/utilities/[id]/route')
  const detail = await (await detailRoute.GET(request('/api/utilities/qa-chicago'), { params: Promise.resolve({ id: utility.id }) })).json()
  assert.equal(detail.pwsid, 'IL0316000')
  assert.equal(detail.officialMonitoring.records.length, 16)
  assert.equal(detail.safetyScore.score, null, 'PFAS-only evidence cannot create an overall safety score')
  const download = await (await detailRoute.GET(request('/api/utilities/qa-chicago?view=official'), { params: Promise.resolve({ id: utility.id }) })).json()
  assert.deepEqual(download, detail.officialMonitoring)
  await require('../../src/app/api/utilities/route').GET(request('/api/utilities?q=IL0316000'))
  assert.ok(lastUtilityQuery.where.OR.some(match => match.pwsid === 'IL0316040' && match.name === chicago.directoryName))
  const oldIdSearch = await (await require('../../src/app/api/utilities/route').GET(request('/api/utilities?q=IL0316040'))).json()
  assert.deepEqual(oldIdSearch, [], 'An incorrect seed ID cannot impersonate an official system')
  assert.equal(writes.length, 0)
  console.log('PASS: EPA map, details, download, corrected-ID search, legacy schema and zero database writes')
})().catch(error => { console.error(error); process.exitCode = 1 })
