import 'server-only'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PLAN_LIMITS, type PlanId } from './plans-data'

export type { PlanId, PlanLimits } from './plans-data'
export { PLAN_LIMITS, assertWithinLimit } from './plans-data'

export async function getOrgPlan(orgId: string): Promise<PlanId> {
  const [o] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  const p = (o?.plan ?? 'starter') as PlanId
  return PLAN_LIMITS[p] ? p : 'starter'
}
