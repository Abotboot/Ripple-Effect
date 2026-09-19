'use strict'

exports.sendDiscordReadingWebhook = async reading => {
  const state = globalThis.__citizenRouteQa
  if (!state) throw new Error('Citizen route QA state is not installed')
  state.readingWebhookCalls.push(reading)
}

exports.sendDiscordAlertWebhook = async alert => {
  const state = globalThis.__citizenRouteQa
  if (!state) throw new Error('Citizen route QA state is not installed')
  state.alertWebhookCalls.push(alert)
}
