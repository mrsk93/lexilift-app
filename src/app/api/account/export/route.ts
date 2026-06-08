import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/org-utils'
import { exportUserData } from '@/lib/account/export'
import { logger } from '@/lib/log/log'
import { captureError } from '@/lib/sentry/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const user = await requireAuth()
    const bundle = await exportUserData(user.id)
    logger.info({ userId: user.id, route: '/api/account/export' }, 'data export generated')
    return NextResponse.json(bundle)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    captureError(err, { route: '/api/account/export' })
    logger.error({ err, route: '/api/account/export' }, 'data export failed')
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
