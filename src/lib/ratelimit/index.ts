import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from './upstash'

export { getRedis } from './upstash'

const limiters: Record<string, Ratelimit> = {}

function getLimiter(name: string, perMinute: number): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (limiters[name]) return limiters[name]
  limiters[name] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(perMinute, '1 m'),
    prefix: `rl:${name}`,
  })
  return limiters[name]
}

export async function rateLimit(
  key: string,
  perMinute = 5
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = getLimiter('auth', perMinute)
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

export function resetLimiters() {
  Object.keys(limiters).forEach((k) => delete limiters[k])
}
