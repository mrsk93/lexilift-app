/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetCurrentProfile, mockUpdate, mockSet, mockWhere } = vi.hoisted(() => ({
  mockGetCurrentProfile: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockWhere: vi.fn(),
}))

vi.mock('@/lib/auth/org-utils', () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    update: mockUpdate,
  },
}))

import { PATCH } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdate.mockReturnValue({ set: mockSet })
  mockSet.mockReturnValue({ where: mockWhere })
  mockWhere.mockResolvedValue([])
})

describe('Title PATCH', () => {
  it('updates the title for a session', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    const req = new Request('http://x', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My new title' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ title: 'My new title' }))
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('updates the model when provided', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    const req = new Request('http://x', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llmModel: 'claude-3-5-sonnet' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ llmModel: 'claude-3-5-sonnet' })
    )
  })

  it('updates both title and model when both provided', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    const req = new Request('http://x', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hello', llmModel: 'gemini-1.5-pro' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(200)
    expect(mockSet).toHaveBeenCalledWith({
      title: 'Hello',
      llmModel: 'gemini-1.5-pro',
    })
  })

  it('rejects empty body', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    const req = new Request('http://x', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when user has no org', async () => {
    mockGetCurrentProfile.mockResolvedValue(null)
    const req = new Request('http://x', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'X' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) })
    expect(res.status).toBe(400)
  })
})
