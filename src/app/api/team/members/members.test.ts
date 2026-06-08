/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireOrgAdmin,
  mockRequireOrgMember,
  mockCreateAdminClient,
  mockDbSelect,
  mockDbUpdate,
  mockDbDelete,
} = vi.hoisted(() => ({
  mockRequireOrgAdmin: vi.fn(),
  mockRequireOrgMember: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbDelete: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon',
  },
}))

vi.mock('@/lib/auth/org-utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/org-utils')>('@/lib/auth/org-utils')
  return {
    ...actual,
    requireOrgAdmin: (...args: unknown[]) => mockRequireOrgAdmin(...args),
    requireOrgMember: (...args: unknown[]) => mockRequireOrgMember(...args),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
    delete: mockDbDelete,
  },
}))

import { GET } from './route'
import { PATCH, DELETE } from './[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateAdminClient.mockReturnValue(null)
})

const memberRow = {
  id: 'm1',
  userId: 'u1',
  role: 'owner',
  fullName: 'Sam',
  avatarUrl: null,
  createdAt: new Date(),
}

describe('Team members API', () => {
  it('GET returns members for the org', async () => {
    mockRequireOrgMember.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockDbSelect.mockReturnValue({
      from: () => ({
        leftJoin: () => ({
          where: () => [memberRow],
        }),
      }),
    })
    const req = new Request('http://x/api/team/members?orgId=o1')
    const res = await GET(req)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].userId).toBe('u1')
    expect(data[0].email).toBeNull()
  })

  it('GET enriches members with emails when admin client available', async () => {
    mockRequireOrgMember.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockDbSelect.mockReturnValue({
      from: () => ({
        leftJoin: () => ({
          where: () => [memberRow],
        }),
      }),
    })
    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'sam@x.com' } } }) } },
    })
    const req = new Request('http://x/api/team/members?orgId=o1')
    const res = await GET(req)
    const data = await res.json()
    expect(data[0].email).toBe('sam@x.com')
  })

  it('GET returns 400 if orgId missing', async () => {
    const req = new Request('http://x/api/team/members')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('GET returns 403 when not a member', async () => {
    mockRequireOrgMember.mockRejectedValue(new Error('Forbidden'))
    mockDbSelect.mockReturnValue({
      from: () => ({
        leftJoin: () => ({
          where: () => [],
        }),
      }),
    })
    const req = new Request('http://x/api/team/members?orgId=o1')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('PATCH updates role', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockDbUpdate.mockReturnValue({ set: () => ({ where: () => [] }) })
    const req = new Request('http://x/api/team/members/m1?orgId=o1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) })
    expect(res.status).toBe(200)
  })

  it('PATCH returns 400 on invalid role', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    const req = new Request('http://x/api/team/members/m1?orgId=o1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'superuser' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) })
    expect(res.status).toBe(400)
  })

  it('DELETE removes a member', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockDbSelect
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => [{ id: 'm2', userId: 'u2', role: 'member' }] }) }) })
    mockDbDelete.mockReturnValue({ where: () => [] })
    const res = await DELETE(
      new Request('http://x/api/team/members/m2?orgId=o1'),
      { params: Promise.resolve({ id: 'm2' }) }
    )
    expect(res.status).toBe(204)
  })

  it('DELETE blocks removing the last owner', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockDbSelect
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => [{ id: 'm1', userId: 'u1', role: 'owner' }] }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => [{ id: 'm1' }] }) })
    const res = await DELETE(
      new Request('http://x/api/team/members/m1?orgId=o1'),
      { params: Promise.resolve({ id: 'm1' }) }
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/last owner/i)
  })
})
