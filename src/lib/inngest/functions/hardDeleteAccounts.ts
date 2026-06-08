import { inngest } from '../client'
import { db } from '@/lib/db/client'
import {
  profiles,
  memberships,
  chatSessions,
  organizations,
} from '@/lib/db/schema'
import { and, eq, isNotNull, lte } from 'drizzle-orm'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/log/log'

export const hardDeleteAccounts = inngest.createFunction(
  { id: 'hard-delete-accounts', triggers: [{ cron: '0 3 * * *' }] },
  async ({ step }) => {
    const cutoff = new Date()

    const expired = await step.run('find-expired', () =>
      db
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          and(isNotNull(profiles.deletionScheduledFor), lte(profiles.deletionScheduledFor, cutoff))
        )
    )

    for (const { id } of expired) {
      await step.run(`delete:${id}`, async () => {
        const userMemberships = await db
          .select({ orgId: memberships.orgId })
          .from(memberships)
          .where(eq(memberships.userId, id))

        for (const { orgId } of userMemberships) {
          if (!orgId) continue
          const owners = await db
            .select({ id: memberships.id })
            .from(memberships)
            .where(and(eq(memberships.orgId, orgId), eq(memberships.role, 'owner')))

          if (owners.length === 1) {
            await db.delete(organizations).where(eq(organizations.id, orgId))
          }
        }

        await db.delete(memberships).where(eq(memberships.userId, id))
        await db.delete(chatSessions).where(eq(chatSessions.userId, id))
        await db.delete(profiles).where(eq(profiles.id, id))

        try {
          const admin = createAdminClient()
          await admin.auth.admin.deleteUser(id)
        } catch (err) {
          logger.warn({ err, userId: id }, 'supabase auth delete failed; continuing')
        }

        return { deleted: id }
      })
    }

    return { processed: expired.length }
  }
)
