/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireOrgAdmin,
  mockRequireOrgMember,
  mockDbUpdate,
  mockDbDelete,
} = vi.hoisted(() => ({
  mockRequireOrgAdmin: vi.fn(),
  mockRequireOrgMember: vi.fn(),
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

vi.mock('@/lib/db/client', () => ({
  db: {
    update: mockDbUpdate,
    delete: mockDbDelete,
  },
}))

import { PUT, DELETE } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockDbUpdate.mockReturnValue({ set: () => ({ where: () => Promise.resolve([]) }) })
  mockDbDelete.mockReturnValue({ where: () => Promise.resolve([]) })
})

describe('Org API', () => {
  it('PUT updates the org name', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'owner' })
    const req = new Request('http://x', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'o1' }) })
    expect(res.status).toBe(200)
  })

  it('PUT rejects empty name', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'owner' })
    const req = new Request('http://x', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'o1' }) })
    expect(res.status).toBe(400)
  })

  it('PUT 403s when id does not match caller org', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'owner' })
    const req = new Request('http://x', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'o2' }) })
    expect(res.status).toBe(403)
  })

  it('DELETE 204s for owner', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'owner' })
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'o1' }) })
    expect(res.status).toBe(204)
  })

  it('DELETE 403s for admin (owner required)', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'admin' })
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'o1' }) })
    expect(res.status).toBe(403)
  })
})
