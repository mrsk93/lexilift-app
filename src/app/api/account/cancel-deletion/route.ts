import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { profiles } from '@/lib/db/schema'
import { logger } from '@/lib/log/log'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const user = await requireAuth()
    await db
      .update(profiles)
      .set({ deletedAt: null, deletionScheduledFor: null })
      .where(eq(profiles.id, user.id))
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
