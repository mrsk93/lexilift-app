import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'
import { Polar } from '@polar-sh/sdk'
import { env } from '@/lib/env'

const STATUS_PLAN: Record<string, 'starter' | 'pro' | 'team'> = {
  active: 'pro',
  trialing: 'pro',
  past_due: 'starter',
  canceled: 'starter',
  unpaid: 'starter',
  incomplete: 'starter',
  incomplete_expired: 'starter',
}

export const syncSubscriptions = inngest.createFunction(
  { id: 'sync-subscriptions', triggers: [{ cron: '0 6 * * *' }] },
  async ({ step }) => {
    if (!env.POLAR_ACCESS_TOKEN) return { synced: 0, skipped: 'POLAR_ACCESS_TOKEN unset' }

    const polar = new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      server: env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    })

    const orgs = await step.run('load-orgs', () =>
      db
        .select({ id: organizations.id, polarSubscriptionId: organizations.polarSubscriptionId })
        .from(organizations)
        .where(isNotNull(organizations.polarSubscriptionId))
    )

    let synced = 0
    for (const org of orgs) {
      if (!org.polarSubscriptionId) continue
      const sub = await step.run(`sub-${org.id}`, () =>
        polar.subscriptions.get({ id: org.polarSubscriptionId! })
      )
      const plan = STATUS_PLAN[sub.status] ?? 'starter'
      await step.run(`update-${org.id}`, () =>
        db.update(organizations).set({ plan }).where(eq(organizations.id, org.id))
      )
      synced++
    }
    return { synced }
  }
)
