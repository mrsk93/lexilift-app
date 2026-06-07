import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export const resetQueryCounts = inngest.createFunction(
  { id: 'reset-query-counts', triggers: [{ cron: '0 0 1 * *' }] },
  async ({ step }) => {
    await step.run('reset', () =>
      db.update(organizations).set({
        queryCount: 0,
        queryResetAt: sql`now() + interval '1 month'`,
      })
    )
    return { reset: true }
  }
)
