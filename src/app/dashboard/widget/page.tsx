import { db } from '@/lib/db/client'
import { widgetTokens } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { env } from '@/lib/env'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { WidgetDashboardClient } from '@/components/widget/WidgetDashboardClient'

export const dynamic = 'force-dynamic'

export default async function WidgetPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  const rows = await db
    .select()
    .from(widgetTokens)
    .where(eq(widgetTokens.orgId, orgId))
    .orderBy(desc(widgetTokens.createdAt))

  const tokens = rows.map((r) => ({
    id: r.id,
    name: r.name ?? 'Unnamed widget',
    token: r.token,
    createdAt: r.createdAt,
  }))

  return <WidgetDashboardClient tokens={tokens} appUrl={env.APP_URL} />
}
