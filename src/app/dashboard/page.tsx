import { db } from '@/lib/db/client'
import { documents, widgetTokens, chatMessages, chatSessions } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'

export default async function DashboardPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  const docs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.orgId, orgId))

  const widgets = await db
    .select({ id: widgetTokens.id })
    .from(widgetTokens)
    .where(and(eq(widgetTokens.orgId, orgId), eq(widgetTokens.isActive, true)))

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const messages = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatSessions.id, chatMessages.sessionId))
    .where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, monthStart)))

  const queryLimit = 1000
  const monthQueries = messages.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Monitor your knowledge base usage and activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Documents</h3>
          <p className="text-3xl font-heading font-semibold">{docs.length}</p>
        </div>
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Queries this month</h3>
          <p className="text-3xl font-heading font-semibold">
            {monthQueries} <span className="text-sm text-muted-foreground font-normal">/ {queryLimit}</span>
          </p>
        </div>
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Widgets</h3>
          <p className="text-3xl font-heading font-semibold">{widgets.length}</p>
        </div>
      </div>
    </div>
  )
}
