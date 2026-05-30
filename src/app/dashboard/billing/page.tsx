import { Suspense } from 'react'
import { db } from '@/lib/db/client'
import { organizations, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { BillingClient } from './BillingClient'

export default async function BillingPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const user = await requireAuth()
  
  // Get user profile to find their current organization
  const profileData = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  const profile = profileData[0]
  const currentOrgId = profile?.currentOrgId
  
  let currentOrg = null
  if (currentOrgId) {
    const orgsData = await db.select().from(organizations).where(eq(organizations.id, currentOrgId)).limit(1)
    currentOrg = orgsData[0]
  }

  const isMockCheckout = searchParams.mock_checkout === 'true'
  const mockPlan = typeof searchParams.plan === 'string' ? searchParams.plan : null

  // Override DB data if mock_checkout is used for local testing
  const orgData = {
    plan: isMockCheckout && mockPlan ? mockPlan : (currentOrg?.plan || 'starter'),
    queryLimit: isMockCheckout && mockPlan === 'pro' ? 5000 : (currentOrg?.queryLimit || 500)
  }

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-muted-foreground">Loading billing...</div>}>
      <BillingClient org={orgData} />
    </Suspense>
  )
}
