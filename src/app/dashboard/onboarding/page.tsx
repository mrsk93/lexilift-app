import { redirect } from 'next/navigation'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  await requireAuth()
  const orgId = await getCurrentOrgId()
  if (!orgId) redirect('/login')
  await requireOrgAccess(orgId)

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      onboardingCompletedAt: organizations.onboardingCompletedAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) redirect('/login')
  if (org.onboardingCompletedAt) redirect('/dashboard')

  return <OnboardingWizard orgId={org.id} initialName={org.name} />
}
