/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireAuth, mockSet, mockWhere, mockLoggerInfo, mockLoggerError } = vi.hoisted(
  () => ({
    mockRequireAuth: vi.fn(),
    mockSet: vi.fn(),
    mockWhere: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerError: vi.fn(),
  })
)

const updateChain = {
  set: (...args: unknown[]) => {
    mockSet(...args)
    return { where: (...w: unknown[]) => mockWhere(...w) }
  },
}

vi.mock('@/lib/db/client', () => ({
  db: {
    update: vi.fn(() => updateChain),
  },
}))

vi.mock('@/lib/auth/org-utils', () => ({
  requireAuth: () => mockRequireAuth(),
}))

vi.mock('@/lib/log/log', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockWhere.mockResolvedValue(undefined)
})

describe('POST /api/account/cancel-deletion', () => {
  it('clears deletedAt and deletionScheduledFor for the authenticated user', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })

    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSet).toHaveBeenCalledWith({ deletedAt: null, deletionScheduledFor: null })
  })

  it('logs the cancellation', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u-xyz' })

    await POST()

    expect(mockLoggerInfo).toHaveBeenCalledWith({ userId: 'u-xyz' }, 'account deletion cancelled')
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('UNAUTHORIZED')
  })

  it('returns 500 on internal failure', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockSet.mockImplementation(() => {
      throw new Error('db down')
    })

    const res = await POST()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('INTERNAL')
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
