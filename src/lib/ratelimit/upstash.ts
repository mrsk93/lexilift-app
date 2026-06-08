import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

let cached: Redis | null | undefined = undefined

export function getRedis(): Redis | null {
  if (cached !== undefined) return cached
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    cached = null
    return null
  }
  cached = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })
  return cached
}
