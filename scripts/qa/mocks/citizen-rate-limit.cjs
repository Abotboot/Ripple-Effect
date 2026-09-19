'use strict'

exports.checkRateLimit = (key, options) => {
  const state = globalThis.__citizenRouteQa
  if (!state) throw new Error('Citizen route QA state is not installed')
  state.rateLimitCalls.push({ key, options })
  return true
}
