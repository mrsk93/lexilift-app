/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireAuth, mockExportUserData, mockLoggerInfo, mockLoggerError, mockCaptureError } =
  vi.hoisted(() => ({
    mockRequireAuth: vi.fn(),
    mockExportUserData: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerError: vi.fn(),
    mockCaptureError: vi.fn(),
  }))

vi.mock('@/lib/auth/org-utils', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/account/export', () => ({
  exportUserData: (...args: unknown[]) => mockExportUserData(...args),
}))

vi.mock('@/lib/log/log', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

vi.mock('@/lib/sentry/server', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeBundle = {
  profile: { id: 'u1' },
  memberships: [],
  organizations: [],
  documents: [],
  chatSessions: [],
  chatMessages: [],
  widgetTokens: [],
  invoices: [],
  exportedAt: '2026-06-08T00:00:00.000Z',
}

describe('POST /api/account/export', () => {
  it('returns the data export bundle for the authenticated user', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockExportUserData.mockResolvedValue(fakeBundle)

    const res = await POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual(fakeBundle)
    expect(mockExportUserData).toHaveBeenCalledWith('u1')
    expect(mockLoggerInfo).toHaveBeenCalled()
  })

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

    const res = await POST()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('UNAUTHORIZED')
    expect(mockExportUserData).not.toHaveBeenCalled()
  })

  it('returns 500 and captures error on internal failure', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    const boom = new Error('db down')
    mockExportUserData.mockRejectedValue(boom)

    const res = await POST()
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('INTERNAL')
    expect(mockCaptureError).toHaveBeenCalledWith(boom, { route: '/api/account/export' })
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
