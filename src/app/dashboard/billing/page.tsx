import { Suspense } from 'react'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { BillingClient } from './BillingClient'

export default async function BillingPage() {
  await requireAuth()

  const currentOrgId = await getCurrentOrgId()
  if (!currentOrgId) return null

  await requireOrgAccess(currentOrgId)

  const orgsData = await db
    .select({
      plan: organizations.plan,
      queryCount: organizations.queryCount,
      queryLimit: organizations.queryLimit,
    })
    .from(organizations)
    .where(eq(organizations.id, currentOrgId))
    .limit(1)

  const currentOrg = orgsData[0]

  const orgData = {
    plan: currentOrg?.plan ?? 'starter',
    queryCount: currentOrg?.queryCount ?? 0,
    queryLimit: currentOrg?.queryLimit ?? 500,
  }

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-muted-foreground">Loading billing...</div>}>
      <BillingClient org={orgData} />
    </Suspense>
  )
}
