/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireAdmin,
  mockRequireMember,
  mockGetCurrentOrgId,
  mockDb,
  mockAssertOrgPlanLimit,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRequireMember: vi.fn(),
  mockGetCurrentOrgId: vi.fn(),
  mockDb: {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
  mockAssertOrgPlanLimit: vi.fn(),
}))

vi.mock('@/lib/auth/org-utils', () => ({
  requireOrgAdmin: mockRequireAdmin,
  requireOrgMember: mockRequireMember,
}))

vi.mock('@/lib/auth/current-org', () => ({
  getCurrentOrgId: mockGetCurrentOrgId,
}))

vi.mock('@/lib/db/client', () => ({ db: mockDb }))

vi.mock('@/lib/billing/assertOrgPlanLimit', () => ({
  assertOrgPlanLimit: mockAssertOrgPlanLimit,
}))

import { GET as LIST, POST as CREATE } from './route'
import { DELETE as REMOVE } from './[id]/route'

describe('Widget tokens API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentOrgId.mockResolvedValue('o1')
    mockRequireAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockRequireMember.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
  })

  it('GET list returns 200 with tokens scoped to current org', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => [{ id: 'w1', name: 'Marketing', token: 'tok', createdAt: new Date() }],
        }),
      }),
    })
    const r = await LIST()
    expect(r.status).toBe(200)
    expect(mockRequireMember).toHaveBeenCalledWith('o1')
    const body = await r.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Marketing')
  })

  it('GET returns 400 when no current org', async () => {
    mockGetCurrentOrgId.mockResolvedValueOnce(null)
    const r = await LIST()
    expect(r.status).toBe(400)
  })

  it('POST creates a token and returns 201', async () => {
    mockDb.insert.mockReturnValueOnce({
      values: () => ({ returning: () => [{ id: 'w1', token: 'tok', name: 'Marketing' }] }),
    })
    const r = await CREATE(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Marketing' }),
      })
    )
    expect(r.status).toBe(201)
    expect(mockRequireAdmin).toHaveBeenCalledWith('o1')
    const body = await r.json()
    expect(body.id).toBe('w1')
  })

  it('POST rejects empty name with 400', async () => {
    const r = await CREATE(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })
    )
    expect(r.status).toBe(400)
  })

  it('POST rejects non-admin with 403', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'))
    const r = await CREATE(
      new Request('http://x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hi' }),
      })
    )
    expect(r.status).toBe(403)
  })

  it('DELETE returns 204', async () => {
    mockDb.delete.mockReturnValueOnce({ where: () => Promise.resolve([]) })
    const r = await REMOVE(new Request('http://x'), {
      params: Promise.resolve({ id: 'w1' }),
    })
    expect(r.status).toBe(204)
    expect(mockRequireAdmin).toHaveBeenCalledWith('o1')
  })

  it('DELETE returns 403 when caller is not admin', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'))
    const r = await REMOVE(new Request('http://x'), {
      params: Promise.resolve({ id: 'w1' }),
    })
    expect(r.status).toBe(403)
  })
})
