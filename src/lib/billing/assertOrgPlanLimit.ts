import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { documents, organizations, widgetTokens } from '@/lib/db/schema'
import { getOrgPlan, PLAN_LIMITS, type PlanId } from './plans'

export type PlanResource = 'documents' | 'queries' | 'widgets'

export async function assertOrgPlanLimit(
  orgId: string,
  resource: PlanResource
): Promise<void> {
  const plan: PlanId = await getOrgPlan(orgId)
  const limit = PLAN_LIMITS[plan][resource]
  if (limit === Infinity) return

  if (resource === 'documents') {
    const rows = await db
      .select({ value: count() })
      .from(documents)
      .where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
    const value = rows[0]?.value ?? 0
    if (value >= limit) throw planLimitError(resource, plan, value, limit)
  } else if (resource === 'queries') {
    const rows = await db
      .select({ q: organizations.queryCount })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
    const current = rows[0]?.q ?? 0
    if (current >= limit) throw planLimitError(resource, plan, current, limit)
  } else if (resource === 'widgets') {
    const rows = await db
      .select({ value: count() })
      .from(widgetTokens)
      .where(eq(widgetTokens.orgId, orgId))
    const value = rows[0]?.value ?? 0
    if (value >= limit) throw planLimitError(resource, plan, value, limit)
  }
}

function planLimitError(
  resource: PlanResource,
  plan: PlanId,
  current: number,
  limit: number
): Error {
  const err = new Error(
    `PLAN_LIMIT_REACHED: ${resource} limit (${current}/${limit}) reached on ${plan} plan`
  ) as Error & { code: string }
  err.code = 'PLAN_LIMIT_REACHED'
  return err
}
