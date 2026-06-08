/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetCurrentProfile = vi.fn()
const mockUpdateFn = vi.fn()
const mockSetFn = vi.fn()
const mockWhereFn = vi.fn()

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon',
  },
}))

vi.mock('@/lib/auth/org-utils', () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdateFn(...args),
  },
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockWhereFn.mockResolvedValue([])
  mockSetFn.mockReturnValue({ where: mockWhereFn })
  mockUpdateFn.mockReturnValue({ set: mockSetFn })
})

describe('Document restore', () => {
  it('clears deletedAt for a soft-deleted doc', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'd1' }),
    })
    expect(res.status).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalled()
    expect(mockSetFn).toHaveBeenCalled()
    const setArg = mockSetFn.mock.calls[0][0] as { deletedAt: null }
    expect(setArg.deletedAt).toBeNull()
  })

  it('returns 400 when user has no org', async () => {
    mockGetCurrentProfile.mockResolvedValue(null)
    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'd1' }),
    })
    expect(res.status).toBe(400)
  })
})
