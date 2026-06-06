import { inngest } from '../client'

export const purgeSoftDeleted = inngest.createFunction(
  { id: 'purge-soft-deleted', triggers: [{ cron: '0 3 * * *' }] },
  async () => {
    return { purged: 0, skipped: 'documents.deletedAt column not yet in schema' }
  }
)
