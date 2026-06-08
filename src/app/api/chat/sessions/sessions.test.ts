/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetCurrentProfile,
  mockSelect,
  mockInsert,
  mockDelete,
} = vi.hoisted(() => ({
  mockGetCurrentProfile: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/lib/auth/org-utils', () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}))

const sessionRow = {
  id: 's1',
  orgId: 'o1',
  userId: 'u1',
  source: 'dashboard',
  title: 'New chat',
  llmModel: 'gpt-4o',
  createdAt: new Date(),
}

const messageRow = {
  id: 'm1',
  sessionId: 's1',
  role: 'user',
  content: 'hi',
  citations: null,
  feedback: null,
  tokensUsed: null,
  latencyMs: null,
  createdAt: new Date(),
}

vi.mock('@/lib/db/client', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  },
}))

import { GET, POST } from './route'
import { DELETE, GET as GETById } from './[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
})

function chainList(rows: unknown[]) {
  const chain: Record<string, unknown> & { then: Promise<unknown>['then'] } = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => rows,
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  }
  return chain
}

describe('Chat sessions API', () => {
  it('GET returns sessions for the current user', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockSelect.mockReturnValue(chainList([sessionRow]))
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('s1')
  })

  it('GET returns 400 when user has no org', async () => {
    mockGetCurrentProfile.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(400)
  })

  it('POST creates a new session', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockInsert.mockReturnValue({
      values: () => ({
        returning: () => [sessionRow],
      }),
    })
    const req = new Request('http://x', { method: 'POST', body: '{}' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('s1')
  })

  it('GET by id returns session with messages', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockSelect
      .mockReturnValueOnce(chainList([sessionRow]))
      .mockReturnValueOnce(chainList([messageRow]))
    const res = await GETById(new Request('http://x'), {
      params: Promise.resolve({ id: 's1' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.session.id).toBe('s1')
    expect(data.messages).toHaveLength(1)
  })

  it('GET by id returns 404 when session not found', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockSelect.mockReturnValue(chainList([]))
    const res = await GETById(new Request('http://x'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })

  it('DELETE removes a session by id', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockDelete.mockReturnValue({ where: () => Promise.resolve([]) })
    const res = await DELETE(new Request('http://x'), {
      params: Promise.resolve({ id: 's1' }),
    })
    expect(res.status).toBe(204)
  })
})
