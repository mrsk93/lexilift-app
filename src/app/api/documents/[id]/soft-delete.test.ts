/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetCurrentProfile = vi.fn()

const mockSetFn = vi.fn()
const mockWhereFn = vi.fn()
const mockUpdateFn = vi.fn()
const mockSelectFn = vi.fn()

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
    select: (...args: unknown[]) => mockSelectFn(...args),
  },
}))

import { DELETE } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockWhereFn.mockResolvedValue([])
  mockSetFn.mockReturnValue({ where: mockWhereFn })
  mockUpdateFn.mockReturnValue({ set: mockSetFn })
  mockSelectFn.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) })
})

describe('Document DELETE (soft)', () => {
  it('marks doc as deleted (sets deletedAt) for the user org', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })

    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'd1' }) })
    expect(res.status).toBe(204)
    expect(mockUpdateFn).toHaveBeenCalled()
    expect(mockSetFn).toHaveBeenCalled()
    const setArg = mockSetFn.mock.calls[0][0] as { deletedAt: Date }
    expect(setArg.deletedAt).toBeInstanceOf(Date)
  })

  it('returns 400 when user has no org', async () => {
    mockGetCurrentProfile.mockResolvedValue(null)
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'd1' }) })
    expect(res.status).toBe(400)
  })
})
