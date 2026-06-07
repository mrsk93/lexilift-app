import { Sidebar } from '@/components/layout/Sidebar'
import { db } from '@/lib/db/client'
import { organizations, memberships } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await requireAuth()
  } catch {
    redirect('/login')
  }

  const currentOrgId = await getCurrentOrgId()
  if (!currentOrgId) redirect('/login')

  const userOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      plan: organizations.plan,
      queryCount: organizations.queryCount,
      queryLimit: organizations.queryLimit,
      onboardingCompletedAt: organizations.onboardingCompletedAt,
    })
    .from(organizations)
    .innerJoin(memberships, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, user.id))

  const currentOrg = userOrgs.find((org) => org.id === currentOrgId)

  const headerList = await headers()
  const pathname = headerList.get('x-pathname') ?? ''
  if (!currentOrg?.onboardingCompletedAt && pathname !== '/dashboard/onboarding') {
    redirect('/dashboard/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        organizations={userOrgs}
        currentOrgId={currentOrgId}
        queryCount={currentOrg?.queryCount ?? 0}
        queryLimit={currentOrg?.queryLimit ?? 500}
      />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
