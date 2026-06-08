export type PlanId = 'starter' | 'pro' | 'team' | 'enterprise'

export interface PlanLimits {
  documents: number
  queries: number
  widgets: number
  storageMb: number
  seats: number
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter:    { documents: 10,     queries: 500,    widgets: 1,    storageMb: 100,   seats: 1 },
  pro:        { documents: 100,    queries: 5000,   widgets: 3,    storageMb: 1024,  seats: 1 },
  team:       { documents: 1000,   queries: 50000,  widgets: 10,   storageMb: 10240, seats: 10 },
  enterprise: { documents: Infinity, queries: Infinity, widgets: Infinity, storageMb: Infinity, seats: Infinity },
}

export function assertWithinLimit(plan: PlanId, resource: keyof PlanLimits, value: number): void {
  const limit = PLAN_LIMITS[plan][resource]
  if (value >= limit) {
    const err = new Error('PLAN_LIMIT_REACHED') as Error & { code: string }
    err.code = 'PLAN_LIMIT_REACHED'
    throw err
  }
}
