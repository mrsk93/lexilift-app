import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { organizations, memberships } from '@/lib/db/schema'
import { and, eq, gt, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export const checkUsageAlerts = inngest.createFunction(
  { id: 'check-usage-alerts', triggers: [{ cron: '0 9 * * *' }] },
  async ({ step }) => {
    const orgs = await step.run('find-over-80', () =>
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          queryCount: organizations.queryCount,
          queryLimit: organizations.queryLimit,
        })
        .from(organizations)
        .where(
          gt(sql`${organizations.queryCount}`, sql`${organizations.queryLimit} * 0.8`)
        )
    )

    if (!env.RESEND_API_KEY || orgs.length === 0) return { sent: 0 }

    const resend = new Resend(env.RESEND_API_KEY)
    const admin = createAdminClient()
    let sent = 0

    for (const org of orgs) {
      const ownerEmail = await step.run(`owner-email-${org.id}`, async () => {
        const rows = await db
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(and(eq(memberships.orgId, org.id), eq(memberships.role, 'owner')))
          .limit(1)
        if (!rows[0]) return null
        const { data, error } = await admin.auth.admin.getUserById(rows[0].userId)
        if (error || !data?.user?.email) return null
        return data.user.email
      })
      if (!ownerEmail) continue

      const used = org.queryCount ?? 0
      const limit = org.queryLimit ?? 1
      const pct = Math.round((used / limit) * 100)

      await step.run(`send-${org.id}`, () =>
        resend.emails.send({
          from: 'LexiLift <alerts@lexilift.com>',
          to: ownerEmail,
          subject: `You've used ${pct}% of your LexiLift queries`,
          html: `<p>Hi,</p><p>Your workspace <b>${org.name}</b> has used ${used} of ${limit} queries this month.</p><p>Upgrade to Pro for more: <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Billing</a></p>`,
        })
      )
      sent++
    }
    return { sent }
  }
)
