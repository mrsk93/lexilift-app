import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions, documents } from '@/lib/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import { StatCard } from '@/components/analytics/StatCard'
import { ChartArea } from '@/components/analytics/ChartArea'
import { ChartPie } from '@/components/analytics/ChartPie'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  await requireAuth()
  const orgId = await getCurrentOrgId()
  if (!orgId) return null
  await requireOrgAccess(orgId)

  // eslint-disable-next-line react-hooks/purity -- force-dynamic server component
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
      date: sql<string>`to_char(date_trunc('day', ${chatMessages.createdAt}), 'MM-DD')`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Last 7 days of activity for your workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Queries" value={qRow?.v ?? 0} />
        <StatCard label="Documents added" value={dRow?.v ?? 0} />
        <StatCard label="Chat sessions" value={sRow?.v ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle className="text-base">Queries per day</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartArea data={series.map((r) => ({ date: r.date, value: r.value }))} />
          </CardContent>
        </Card>
        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle className="text-base">Documents by source</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartPie data={bySource.map((r) => ({ name: r.name ?? 'unknown', value: r.value }))} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
