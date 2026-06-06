/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockSelect,
  mockUpdate,
  mockFrom,
  mockWhere,
  mockLimit,
  mockOrderBy,
  mockSet,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockOrderBy: vi.fn(),
  mockSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
}))

vi.mock('./supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}))

import { getCurrentOrgId } from './current-org'

describe('getCurrentOrgId', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy })
    mockOrderBy.mockReturnValue({ limit: mockLimit })

    mockUpdate.mockReturnValue({ set: mockSet })
    mockSet.mockReturnValue({ where: mockUpdateWhere })
    mockUpdateWhere.mockResolvedValue(undefined)
  })

  it('returns null when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await getCurrentOrgId()

    expect(result).toBeNull()
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns profile.currentOrgId when set', async () => {
    const userId = '11111111-1111-1111-1111-111111111111'
    const orgId = '22222222-2222-2222-2222-222222222222'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    mockLimit.mockResolvedValueOnce([{ currentOrgId: orgId }])

    const result = await getCurrentOrgId()

    expect(result).toBe(orgId)
    expect(mockOrderBy).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('falls back to first membership (chronological) and updates profile when currentOrgId is null', async () => {
    const userId = '11111111-1111-1111-1111-111111111111'
    const orgId = '33333333-3333-3333-3333-333333333333'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    mockLimit.mockResolvedValueOnce([{ currentOrgId: null }])
    mockLimit.mockResolvedValueOnce([{ orgId }])

    const result = await getCurrentOrgId()

    expect(result).toBe(orgId)
    expect(mockOrderBy).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith({ currentOrgId: orgId })
  })

  it('throws when user has no org membership and no currentOrgId', async () => {
    const userId = '11111111-1111-1111-1111-111111111111'
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    mockLimit.mockResolvedValueOnce([{ currentOrgId: null }])
    mockLimit.mockResolvedValueOnce([])

    await expect(getCurrentOrgId()).rejects.toThrow(/no organization membership/i)
  })
})
