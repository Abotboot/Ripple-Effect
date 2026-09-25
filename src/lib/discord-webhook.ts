const REPORTS_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_REPORTS
const ALERTS_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_ALERTS

export async function sendDiscordReportWebhook(report: {
  title: string
  description: string
  zipCode: string
  city?: string | null
  state?: string | null
  contaminant?: string | null
  appearance?: string | null
  severity?: string | null
  reporterName?: string | null
}) {
  if (!REPORTS_WEBHOOK_URL) return
  try {
    const location = [report.city, report.state, report.zipCode]
      .filter(Boolean)
      .join(', ')

    const severityEmoji: Record<string, string> = {
      info: '🔵 Info',
      warning: '🟡 Warning',
      critical: '🔴 Critical',
    }

    const payload = {
      username: 'Ripple Water Monitor',
      allowed_mentions: { parse: [] },
      avatar_url: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/droplet.svg',
      embeds: [
        {
          title: `🧪 New Field Report: ${report.title}`,
          description: report.description,
          color: report.severity === 'critical' ? 0xef4444 : 0x0ea5e9,
          fields: [
            { name: '📍 Location', value: location || 'Unknown', inline: true },
            {
              name: '⚠️ Severity',
              value: severityEmoji[report.severity || 'info'] || report.severity || 'Info',
              inline: true,
            },
            {
              name: '🔬 Contaminant',
              value: report.contaminant || 'Unspecified',
              inline: true,
            },
            {
              name: '💧 Appearance',
              value: report.appearance || 'Normal',
              inline: true,
            },
            {
              name: '👤 Reported By',
              value: report.reporterName || 'Anonymous Citizen',
              inline: true,
            },
          ],
          footer: {
            text: 'A Ripple Effect • Community Science Stream',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    await fetch(REPORTS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Failed to send Discord report webhook:', err)
  }
}

export async function sendDiscordReadingWebhook(reading: {
  contaminantName: string
  level: number
  unit: string
  location?: string | null
  reporterName?: string | null
  utilityName?: string | null
  notes?: string | null
  reviewState?: 'unreviewed' | 'provisional-device'
}) {
  if (!REPORTS_WEBHOOK_URL) return
  try {
    const payload = {
      username: 'Ripple Water Monitor',
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: reading.reviewState === 'provisional-device'
            ? `🤖 New Provisional Device Reading: ${reading.contaminantName}`
            : `💧 New Unreviewed Citizen Reading: ${reading.contaminantName}`,
          description: reading.reviewState === 'provisional-device'
            ? `A device reading of **${reading.level} ${reading.unit}** was recorded as provisional. This notification is not a reviewed safety assessment or threshold alert.`
            : `A citizen science reading of **${reading.level} ${reading.unit}** was recorded and queued for review. This notification is not a safety assessment or threshold alert.`,
          color: 0x0ea5e9,
          fields: [
            {
              name: '📍 Location / Utility',
              value: reading.utilityName || reading.location || 'Local Watershed',
              inline: true,
            },
            {
              name: '📊 Measured Level',
              value: `${reading.level} ${reading.unit}`,
              inline: true,
            },
            {
              name: '👤 Submitted By',
              value: reading.reporterName || 'Citizen Scientist',
              inline: true,
            },
            ...(reading.notes
              ? [{ name: '📝 Notes', value: reading.notes, inline: false }]
              : []),
          ],
          footer: {
            text: reading.reviewState === 'provisional-device'
              ? 'A Ripple Effect • Provisional device submission'
              : 'A Ripple Effect • Unreviewed community submission',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    await fetch(REPORTS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Failed to send Discord reading webhook:', err)
  }
}

export async function sendDiscordAlertWebhook(alert: {
  contaminantName: string
  level: number
  unit: string
  legalLimit?: number | null
  healthGuideline?: number | null
  location?: string | null
  utilityName?: string | null
}) {
  if (!ALERTS_WEBHOOK_URL) return
  try {
    const exceedsLegal = alert.legalLimit != null && alert.level > alert.legalLimit
    const exceedsHealth = alert.healthGuideline != null && alert.level > alert.healthGuideline

    const payload = {
      username: 'Ripple Alert System',
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `🚨 Contaminant Threshold Alert: ${alert.contaminantName}`,
          description: `Water quality reading exceeds safety thresholds at **${alert.utilityName || alert.location || 'Monitored Facility'}**.`,
          color: exceedsLegal ? 0xef4444 : 0xf59e0b,
          fields: [
            {
              name: '📍 Location / Utility',
              value: alert.utilityName || alert.location || 'Unknown',
              inline: true,
            },
            {
              name: '📊 Measured Value',
              value: `**${alert.level} ${alert.unit}**`,
              inline: true,
            },
            {
              name: '⚖️ Legal Limit (MCL)',
              value: alert.legalLimit != null ? `${alert.legalLimit} ${alert.unit}` : 'Benchmark unavailable',
              inline: true,
            },
            {
              name: '🏥 Health Guideline',
              value: alert.healthGuideline != null ? `${alert.healthGuideline} ${alert.unit}` : 'Benchmark unavailable',
              inline: true,
            },
            {
              name: '⚠️ Status',
              value: exceedsLegal
                ? '🔴 **EXCEEDS EPA LEGAL LIMIT**'
                : exceedsHealth
                ? '🟡 **EXCEEDS HEALTH GUIDELINE**'
                : 'Notice',
              inline: false,
            },
          ],
          footer: {
            text: 'A Ripple Effect • Automated Contaminant Alert Network',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    await fetch(ALERTS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Failed to send Discord alert webhook:', err)
  }
}

