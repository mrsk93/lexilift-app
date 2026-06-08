import { NextResponse } from 'next/server'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions, documents } from '@/lib/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'

export async function GET() {
  await requireAuth()
  const orgId = await getCurrentOrgId()
  if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 })
  await requireOrgAccess(orgId)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [qRow] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, weekAgo)))

  const [dRow] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(eq(documents.orgId, orgId), gte(documents.createdAt, weekAgo)))

  const [sRow] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(chatSessions)
    .where(and(eq(chatSessions.orgId, orgId), gte(chatSessions.createdAt, weekAgo)))

  const series = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${chatMessages.createdAt}), 'YYYY-MM-DD')`,
      value: sql<number>`count(*)::int`,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, weekAgo)))
    .groupBy(sql`date_trunc('day', ${chatMessages.createdAt})`)

  const bySource = await db
    .select({ name: documents.fileType, value: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.orgId, orgId))
    .groupBy(documents.fileType)

  return NextResponse.json({
    totals: {
      queries: qRow?.v ?? 0,
      documents: dRow?.v ?? 0,
      sessions: sRow?.v ?? 0,
    },
    series,
    bySource: bySource.map((r) => ({ name: r.name ?? 'unknown', value: r.value })),
  })
}
