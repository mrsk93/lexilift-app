import { inngest } from '../client'

export const resetQueryCounts = inngest.createFunction(
  { id: 'reset-query-counts', triggers: [{ cron: '0 0 1 * *' }] },
  async ({ step }) => {
    return { ok: true }
  }
)
