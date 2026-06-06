import { inngest, subscriptionSync } from '../client'

export const syncSubscriptions = inngest.createFunction(
  { id: 'sync-subscriptions', triggers: [subscriptionSync] },
  async ({ event, step }) => {
    return { ok: true, orgId: event.data.orgId }
  }
)
