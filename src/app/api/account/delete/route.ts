import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { profiles } from '@/lib/db/schema'
import { logger } from '@/lib/log/log'
import { captureError } from '@/lib/sentry/server'
import { trackServerEvent } from '@/lib/analytics/posthog-server'

export const dynamic = 'force-dynamic'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function POST() {
  try {
    const user = await requireAuth()
    const deletedAt = new Date()
    const scheduledFor = new Date(Date.now() + THIRTY_DAYS_MS)

    await db
      .update(profiles)
      .set({ deletedAt, deletionScheduledFor: scheduledFor })
      .where(eq(profiles.id, user.id))

    try {
      await trackServerEvent({
        distinctId: user.id,
        event: 'user.account_deletion_requested',
        properties: { scheduledFor: scheduledFor.toISOString() },
      })
    } catch (err) {
      logger.warn({ err }, 'posthog track failed (non-blocking)')
    }

    logger.info(
      { userId: user.id, scheduledFor: scheduledFor.toISOString() },
      'account deletion requested'
    )

    return NextResponse.json({ ok: true, scheduledFor: scheduledFor.toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    captureError(err, { route: '/api/account/delete' })
    logger.error({ err, route: '/api/account/delete' }, 'account deletion failed')
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
