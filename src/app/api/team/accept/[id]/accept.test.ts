/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetCurrentUser, mockDbSelect, mockDbInsert, mockDbUpdate } = vi.hoisted(
  () => ({
    mockGetCurrentUser: vi.fn(),
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
    mockDbUpdate: vi.fn(),
  })
)

vi.mock('@/lib/auth/org-utils', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Invite accept', () => {
  it('accepts a valid invite for the logged-in user', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'u2' })
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [
            {
              id: 'inv-uuid-1',
              orgId: 'o1',
              role: 'member',
              acceptedAt: null,
              expiresAt: futureDate,
            },
          ],
        }),
      }),
    })
    mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) })
    mockDbUpdate.mockReturnValue({
      set: () => ({ where: vi.fn().mockResolvedValue([]) }),
    })

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'inv-uuid-1' }),
    })
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.orgId).toBe('o1')
    expect(mockDbInsert).toHaveBeenCalled()
  })

  it('rejects unauthenticated requests', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'inv-uuid-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown invite id', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'u2' })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [] }) }),
    })
    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })
})
