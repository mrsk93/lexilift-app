import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { processDocument } from '@/lib/inngest/functions/processDocument'
import { resetQueryCounts } from '@/lib/inngest/functions/resetQueryCounts'
import { checkUsageAlerts } from '@/lib/inngest/functions/checkUsageAlerts'
import { syncSubscriptions } from '@/lib/inngest/functions/syncSubscriptions'
import { purgeSoftDeleted } from '@/lib/inngest/functions/purgeSoftDeleted'
import { hardDeleteAccounts } from '@/lib/inngest/functions/hardDeleteAccounts'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processDocument,
    resetQueryCounts,
    checkUsageAlerts,
    syncSubscriptions,
    purgeSoftDeleted,
    hardDeleteAccounts,
  ],
})
