import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { logger } from '@/lib/log/log'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {}
  try {
    await db.execute(sql`SELECT 1`)
    checks.db = 'ok'
  } catch (err) {
    checks.db = 'fail'
    logger.error({ err }, 'readiness probe: db check failed')
  }
  const ok = Object.values(checks).every((v) => v === 'ok')
  return NextResponse.json(
    { status: ok ? 'ready' : 'degraded', checks },
    { status: ok ? 200 : 503 }
  )
}
