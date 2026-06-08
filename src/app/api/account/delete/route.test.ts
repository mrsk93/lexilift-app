/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireAuth,
  mockSet,
  mockWhere,
  mockLoggerInfo,
  mockLoggerError,
  mockLoggerWarn,
  mockCaptureError,
  mockTrackServerEvent,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockSet: vi.fn(),
  mockWhere: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockCaptureError: vi.fn(),
  mockTrackServerEvent: vi.fn(),
}))

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
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}))

vi.mock('@/lib/sentry/server', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}))

vi.mock('@/lib/analytics/posthog-server', () => ({
  trackServerEvent: (...args: unknown[]) => mockTrackServerEvent(...args),
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockWhere.mockResolvedValue(undefined)
})

describe('POST /api/account/delete', () => {
  it('schedules deletion 30 days in the future for the authenticated user', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockTrackServerEvent.mockResolvedValue(undefined)

    const before = Date.now()
    const res = await POST()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    const scheduledMs = new Date(body.scheduledFor).getTime()
    expect(scheduledMs).toBeGreaterThan(before + 29 * 24 * 60 * 60 * 1000)
    expect(scheduledMs).toBeLessThan(Date.now() + 31 * 24 * 60 * 60 * 1000)
  })

  it('sets deletedAt and deletionScheduledFor on the user profile', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u-abc' })
    mockTrackServerEvent.mockResolvedValue(undefined)

    await POST()

    expect(mockSet).toHaveBeenCalledTimes(1)
    const setArg = mockSet.mock.calls[0][0] as { deletedAt: Date; deletionScheduledFor: Date }
    expect(setArg.deletedAt).toBeInstanceOf(Date)
    expect(setArg.deletionScheduledFor).toBeInstanceOf(Date)
  })

  it('tracks the deletion event in PostHog (non-blocking)', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockTrackServerEvent.mockResolvedValue(undefined)

    await POST()

    expect(mockTrackServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'u1',
        event: 'user.account_deletion_requested',
      })
    )
  })

  it('does not 500 if PostHog tracking fails', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockTrackServerEvent.mockRejectedValue(new Error('posthog down'))

    const res = await POST()
    expect(res.status).toBe(200)
    expect(mockLoggerWarn).toHaveBeenCalled()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('UNAUTHORIZED')
  })

  it('returns 500 and captures error on internal failure', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockSet.mockImplementation(() => {
      throw new Error('db down')
    })

    const res = await POST()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('INTERNAL')
    expect(mockCaptureError).toHaveBeenCalled()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
