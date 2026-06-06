import { inngest } from '../client'

export const checkUsageAlerts = inngest.createFunction(
  { id: 'check-usage-alerts', triggers: [{ cron: '0 9 * * *' }] },
  async ({ step }) => {
    return { ok: true }
  }
)
