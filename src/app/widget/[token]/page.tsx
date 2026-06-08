import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { organizations, widgetTokens } from '@/lib/db/schema'
import { WidgetChat } from '@/components/widget/WidgetChat'

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const [row] = await db
    .select({
      orgId: widgetTokens.orgId,
      orgName: organizations.name,
      isActive: widgetTokens.isActive,
      primaryColor: widgetTokens.primaryColor,
      welcomeMessage: widgetTokens.welcomeMessage,
    })
    .from(widgetTokens)
    .innerJoin(organizations, eq(widgetTokens.orgId, organizations.id))
    .where(eq(widgetTokens.token, token))
    .limit(1)

  if (!row || !row.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Widget not found</h1>
          <p className="text-muted-foreground text-sm">
            This widget link is invalid or has been disabled. Please contact the site owner.
          </p>
        </div>
      </div>
    )
  }

  return (
    <WidgetChat
      token={token}
      orgName={row.orgName}
      primaryColor={row.primaryColor ?? undefined}
      welcomeMessage={row.welcomeMessage ?? undefined}
    />
  )
}
