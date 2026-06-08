import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from './upstash'

const limiters: Record<string, Ratelimit | null> = {}

function getLimiter(scope: string, perMinute: number): Ratelimit | null {
  if (scope in limiters) return limiters[scope]
  const redis = getRedis()
  if (!redis) {
    limiters[scope] = null
    return null
  }
  limiters[scope] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(perMinute, '1 m'),
    prefix: `rl:${scope}`,
  })
  return limiters[scope]
}

const LIMITS = {
  query: 60,
  widgetChat: 30,
  ingest: 20,
  signup: 5,
} as const

export type Scope = keyof typeof LIMITS

export interface LimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export async function checkLimit(scope: Scope, key: string): Promise<LimitResult> {
  const perMinute = LIMITS[scope]
  const limiter = getLimiter(scope, perMinute)
  if (!limiter) {
    return { success: true, limit: perMinute, remaining: perMinute, reset: 0 }
  }
  const result = await limiter.limit(key)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

export function resetScopesLimiters() {
  Object.keys(limiters).forEach((k) => delete limiters[k])
}
