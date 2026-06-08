/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
}))

vi.mock('./supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockSelect,
  },
}))

import {
  getCurrentUser,
  getCurrentProfile,
  getUserRole,
  isOwner,
  isAdmin,
  isMember,
  requireAuth,
  requireOrgAccess,
  getMembershipContext,
  requireOrgMember,
  requireOrgAdmin,
} from './org-utils'

const USER_ID = '11111111-1111-1111-1111-111111111111'
const ORG_ID = '22222222-2222-2222-2222-222222222222'

function chainSelect(rows: unknown[]) {
  mockSelect.mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ where: mockWhere })
  mockWhere.mockReturnValue({ limit: mockLimit })
  mockLimit.mockResolvedValue(rows)
}

describe('org-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('returns the supabase user when signed in', async () => {
      const user = { id: USER_ID, email: 'a@b.c' }
      mockGetUser.mockResolvedValue({ data: { user } })
      await expect(getCurrentUser()).resolves.toBe(user)
    })

    it('returns null when no user is signed in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      await expect(getCurrentUser()).resolves.toBeNull()
    })
  })

  describe('getCurrentProfile', () => {
    it('returns null when there is no signed-in user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      await expect(getCurrentProfile()).resolves.toBeNull()
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns the profile row when one exists', async () => {
      const profile = { id: USER_ID, fullName: 'Test', avatarUrl: null }
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([profile])
      await expect(getCurrentProfile()).resolves.toBe(profile)
    })

    it('returns null when the profile row is missing', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([])
      await expect(getCurrentProfile()).resolves.toBeNull()
    })
  })

  describe('getUserRole', () => {
    it("returns the role string from the membership row", async () => {
      chainSelect([{ role: 'admin' }])
      await expect(getUserRole(ORG_ID, USER_ID)).resolves.toBe('admin')
    })

    it('returns null when no membership row exists', async () => {
      chainSelect([])
      await expect(getUserRole(ORG_ID, USER_ID)).resolves.toBeNull()
    })
  })

  describe('role helpers', () => {
    it('isOwner is true only for owner role', async () => {
      chainSelect([{ role: 'owner' }])
      await expect(isOwner(ORG_ID, USER_ID)).resolves.toBe(true)

      chainSelect([{ role: 'admin' }])
      await expect(isOwner(ORG_ID, USER_ID)).resolves.toBe(false)
    })

    it('isAdmin is true for owner and admin', async () => {
      chainSelect([{ role: 'owner' }])
      await expect(isAdmin(ORG_ID, USER_ID)).resolves.toBe(true)

      chainSelect([{ role: 'admin' }])
      await expect(isAdmin(ORG_ID, USER_ID)).resolves.toBe(true)

      chainSelect([{ role: 'member' }])
      await expect(isAdmin(ORG_ID, USER_ID)).resolves.toBe(false)
    })

    it('isMember is true for owner, admin, and member', async () => {
      for (const role of ['owner', 'admin', 'member']) {
        chainSelect([{ role }])
        await expect(isMember(ORG_ID, USER_ID)).resolves.toBe(true)
      }
      chainSelect([])
      await expect(isMember(ORG_ID, USER_ID)).resolves.toBe(false)
    })
  })

  describe('requireAuth', () => {
    it('returns the user when authenticated', async () => {
      const user = { id: USER_ID }
      mockGetUser.mockResolvedValue({ data: { user } })
      await expect(requireAuth()).resolves.toBe(user)
    })

    it('throws Unauthorized when no user is signed in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })
  })

  describe('requireOrgAccess', () => {
    it('returns the user when they have a membership in the org', async () => {
      const user = { id: USER_ID }
      mockGetUser.mockResolvedValue({ data: { user } })
      chainSelect([{ role: 'member' }])
      await expect(requireOrgAccess(ORG_ID)).resolves.toBe(user)
    })

    it('throws Forbidden when the user has no membership in the org', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([])
      await expect(requireOrgAccess(ORG_ID)).rejects.toThrow('Forbidden')
    })

    it('propagates Unauthorized when no user is signed in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      await expect(requireOrgAccess(ORG_ID)).rejects.toThrow('Unauthorized')
    })
  })

  describe('getMembershipContext / requireOrgMember', () => {
    it('returns the membership context for a valid member', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([{ role: 'member' }])
      const ctx = await getMembershipContext(ORG_ID)
      expect(ctx).toEqual({ userId: USER_ID, orgId: ORG_ID, role: 'member' })
    })

    it('requireOrgMember is equivalent to getMembershipContext', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([{ role: 'admin' }])
      const ctx = await requireOrgMember(ORG_ID)
      expect(ctx).toEqual({ userId: USER_ID, orgId: ORG_ID, role: 'admin' })
    })

    it('throws Forbidden when the user has no membership in the org', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([])
      await expect(getMembershipContext(ORG_ID)).rejects.toThrow('Forbidden')
    })
  })

  describe('requireOrgAdmin', () => {
    it('returns the context for an owner', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([{ role: 'owner' }])
      const ctx = await requireOrgAdmin(ORG_ID)
      expect(ctx.role).toBe('owner')
    })

    it('returns the context for an admin', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([{ role: 'admin' }])
      const ctx = await requireOrgAdmin(ORG_ID)
      expect(ctx.role).toBe('admin')
    })

    it('rejects a plain member with Forbidden', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([{ role: 'member' }])
      await expect(requireOrgAdmin(ORG_ID)).rejects.toThrow('Forbidden')
    })

    it('rejects a user with no membership in the org with Forbidden', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      chainSelect([])
      await expect(requireOrgAdmin(ORG_ID)).rejects.toThrow('Forbidden')
    })
  })
})
