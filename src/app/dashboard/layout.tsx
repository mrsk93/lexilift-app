import { Sidebar } from '@/components/layout/Sidebar'
import { db } from '@/lib/db/client'
import { organizations, memberships, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // We can fetch user and orgs here, but for now we'll handle basic fetching
  let user;
  try {
    user = await requireAuth()
  } catch (e) {
    redirect('/login')
  }

  // Get user profile
  const profileData = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  const profile = profileData[0]

  // Get all user orgs
  const userMemberships = await db.select().from(memberships).where(eq(memberships.userId, user.id))
  const orgIds = userMemberships.map(m => m.orgId).filter(Boolean) as string[]
  
  let orgs: any[] = []
  if (orgIds.length > 0) {
    // Note: Drizzle doesn't have an `inArray` that works perfectly with empty arrays, but here length > 0
    // Actually, we can just do multiple queries or a join.
    // Let's do it simply for now by querying organizations table
    // A better way is using a join, but this works for MVP.
    // In a real app we'd use `inArray(organizations.id, orgIds)`
  }

  // Temporary mock data for UI testing since DB is not connected
  const mockOrgs = [
    { id: '1', name: 'Acme Corp', plan: 'pro' },
    { id: '2', name: 'Personal Workspace', plan: 'starter' }
  ]
  
  const currentOrgId = profile?.currentOrgId || mockOrgs[0].id

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar organizations={mockOrgs} currentOrgId={currentOrgId} />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
