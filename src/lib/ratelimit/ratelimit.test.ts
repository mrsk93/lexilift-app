/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockLimit, MockRatelimit } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  const MockRatelimit = vi.fn().mockImplementation(function () { return { limit: mockLimit } })
  ;(MockRatelimit as unknown as { slidingWindow: () => unknown }).slidingWindow = () => ({})
  return { mockLimit, MockRatelimit }
})

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
  default: MockRatelimit,
}))

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(function () { return {} }),
}))

vi.mock('@/lib/env', () => ({
  env: {
    UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'y',
  },
}))

import { rateLimit, resetLimiters } from './index'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLimiters()
  })

  it('returns success when limit not exceeded', async () => {
    mockLimit.mockResolvedValueOnce({ success: true, limit: 5, remaining: 4, reset: 0 })
    const r = await rateLimit('login:1.2.3.4', 5)
    expect(r.success).toBe(true)
  })

  it('returns failure when limit exceeded', async () => {
    mockLimit.mockResolvedValueOnce({ success: false, limit: 5, remaining: 0, reset: 0 })
    const r = await rateLimit('login:1.2.3.4', 5)
    expect(r.success).toBe(false)
  })

  it('returns success (no-op) when Upstash is not configured', async () => {
    vi.resetModules()
    vi.doMock('@/lib/env', () => ({
      env: {
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined,
      },
    }))
    const mod = await import('./index')
    expect(mod.getRedis()).toBeNull()
    const r = await mod.rateLimit('login:1.2.3.4', 5)
    expect(r.success).toBe(true)
  })
})
