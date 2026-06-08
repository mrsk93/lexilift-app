/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockInsert, mockValues, mockHeaders } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockHeaders: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))

import { logAuditEvent } from './log'

beforeEach(() => {
  vi.clearAllMocks()
  mockValues.mockResolvedValue(undefined)
  mockInsert.mockReturnValue({ values: mockValues })
  mockHeaders.mockResolvedValue(new Headers())
})

describe('logAuditEvent', () => {
  it('inserts a row with all fields', async () => {
    await logAuditEvent({
      orgId: 'o1',
      actorId: 'u1',
      action: 'org.delete',
      targetType: 'organization',
      targetId: 'o1',
      metadata: { foo: 'bar' },
    })

    expect(mockInsert).toHaveBeenCalled()
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'o1',
        actorId: 'u1',
        action: 'org.delete',
        targetType: 'organization',
        targetId: 'o1',
        metadata: { foo: 'bar' },
      })
    )
  })

  it('captures IP and user agent from request headers', async () => {
    const h = new Headers()
    h.set('x-forwarded-for', '203.0.113.5, 10.0.0.1')
    h.set('user-agent', 'Mozilla/5.0')
    mockHeaders.mockResolvedValue(h)

    await logAuditEvent({ orgId: 'o1', actorId: 'u1', action: 'org.delete' })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '203.0.113.5',
        userAgent: 'Mozilla/5.0',
      })
    )
  })

  it('falls back to x-real-ip when x-forwarded-for is missing', async () => {
    const h = new Headers()
    h.set('x-real-ip', '198.51.100.7')
    mockHeaders.mockResolvedValue(h)

    await logAuditEvent({ orgId: 'o1', actorId: 'u1', action: 'org.delete' })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '198.51.100.7' })
    )
  })

  it('does not throw when called outside a request context', async () => {
    mockHeaders.mockRejectedValue(new Error('outside request'))

    await expect(
      logAuditEvent({ orgId: 'o1', actorId: 'u1', action: 'org.delete' })
    ).resolves.toBeUndefined()

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ ip: null, userAgent: null })
    )
  })
})
