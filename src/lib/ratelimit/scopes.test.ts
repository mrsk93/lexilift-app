/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockLimit, MockRatelimit } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  const MockRatelimit = vi.fn().mockImplementation(function () {
    return { limit: mockLimit }
  })
  ;(MockRatelimit as unknown as { slidingWindow: () => unknown }).slidingWindow = () => ({})
  return { mockLimit, MockRatelimit }
})

const mockGetRedis = vi.hoisted(() => vi.fn())

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
  default: MockRatelimit,
}))

vi.mock('./upstash', () => ({
  getRedis: () => mockGetRedis(),
}))

import { checkLimit, resetScopesLimiters } from './scopes'

describe('checkLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetScopesLimiters()
  })

  it('returns success when under the limit', async () => {
    mockGetRedis.mockReturnValue({})
    mockLimit.mockResolvedValueOnce({ success: true, limit: 60, remaining: 59, reset: 0 })
    const r = await checkLimit('query', 'o1')
    expect(r.success).toBe(true)
    expect(r.limit).toBe(60)
  })

  it('returns failure when over the limit', async () => {
    mockGetRedis.mockReturnValue({})
    mockLimit.mockResolvedValueOnce({ success: false, limit: 60, remaining: 0, reset: 0 })
    const r = await checkLimit('query', 'o1')
    expect(r.success).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('returns success (no-op) when Redis is not configured', async () => {
    mockGetRedis.mockReturnValue(null)
    const r = await checkLimit('query', 'o1')
    expect(r.success).toBe(true)
    expect(MockRatelimit).not.toHaveBeenCalled()
  })

  it('uses different limits for different scopes', async () => {
    mockGetRedis.mockReturnValue({})
    mockLimit.mockResolvedValue({ success: true, limit: 1, remaining: 1, reset: 0 })
    await checkLimit('query', 'o1')
    await checkLimit('widgetChat', 't1')
    await checkLimit('ingest', 'o1')
    await checkLimit('signup', 'ip1')
    expect(MockRatelimit).toHaveBeenCalledTimes(4)
  })
})
