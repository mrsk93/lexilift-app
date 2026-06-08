import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships, profiles } from '@/lib/db/schema'
import { logger } from '@/lib/log/log'
import { logAuditEvent } from '@/lib/audit/log'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const user = await requireAuth()
    await db
      .update(profiles)
      .set({ deletedAt: null, deletionScheduledFor: null })
      .where(eq(profiles.id, user.id))

    const firstMembership = await db
      .select({ orgId: memberships.orgId })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .orderBy(desc(memberships.createdAt))
      .limit(1)

    const firstOrgId = firstMembership[0]?.orgId
    if (firstOrgId) {
      try {
        await logAuditEvent({
          orgId: firstOrgId,
          actorId: user.id,
          action: 'account.delete.cancelled',
          targetType: 'user',
          targetId: user.id,
        })
      } catch (auditErr) {
        logger.warn({ err: auditErr }, 'audit log failed (non-blocking)')
      }
    }

    logger.info({ userId: user.id }, 'account deletion cancelled')
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    logger.error({ err, route: '/api/account/cancel-deletion' }, 'cancel deletion failed')
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
