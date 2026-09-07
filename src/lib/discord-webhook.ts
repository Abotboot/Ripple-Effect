const REPORTS_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_REPORTS ||
  'https://discord.com/api/webhooks/1546398624643031143/SSIAAqxJqI0nQFYIP6nSAE2CrW6vNXzFdx1VY-0RQopZpaKQ9XGb25R9nwupqwHdFh_e'

const ALERTS_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_ALERTS ||
  'https://discord.com/api/webhooks/1546398627684032544/Me_NKfiZ4l_h-MsZxARa_wgJu3Pg9Sat898xhEy-7bW7OYtSVnus2GqVSdy5nCCdgBH3'

export async function sendDiscordReportWebhook(report: {
  title: string
  description: string
  zipCode: string
  city?: string | null
  state?: string | null
  contaminant?: string | null
  appearance?: string
  severity?: string
  reporterName?: string | null
}) {
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
}) {
  try {
    const payload = {
      username: 'Ripple Water Monitor',
      avatar_url: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/droplet.svg',
      embeds: [
        {
          title: `💧 New Citizen Reading: ${reading.contaminantName}`,
          description: `A citizen science reading of **${reading.level} ${reading.unit}** was recorded on the platform.`,
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
    console.error('Failed to send Discord reading webhook:', err)
  }
}

