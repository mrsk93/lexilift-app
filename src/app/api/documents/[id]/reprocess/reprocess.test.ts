/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetCurrentProfile = vi.fn()
const mockInngestSend = vi.fn()
const mockSelectFn = vi.fn()
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

vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: (...args: unknown[]) => mockInngestSend(...args) },
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    select: (...args: unknown[]) => mockSelectFn(...args),
    update: (...args: unknown[]) => mockUpdateFn(...args),
  },
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockWhereFn.mockResolvedValue([])
  mockSetFn.mockReturnValue({ where: mockWhereFn })
  mockUpdateFn.mockReturnValue({ set: mockSetFn })
  mockInngestSend.mockResolvedValue({ ids: ['evt-1'] })
})

describe('Document reprocess', () => {
  it('re-fires document/uploaded for a file doc', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockSelectFn.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [
            { id: 'd1', orgId: 'o1', fileType: 'application/pdf', sourceUrl: null },
          ],
        }),
      }),
    })

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'd1' }),
    })
    expect(res.status).toBe(200)
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'document/uploaded', data: { docId: 'd1' } })
    )
  })

  it('re-fires document/url.submitted for a URL doc', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockSelectFn.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [
            { id: 'd2', orgId: 'o1', fileType: 'url', sourceUrl: 'https://example.com' },
          ],
        }),
      }),
    })

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'd2' }),
    })
    expect(res.status).toBe(200)
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'document/url.submitted',
        data: { documentId: 'd2', url: 'https://example.com' },
      })
    )
  })

  it('returns 404 for missing doc', async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', currentOrgId: 'o1' })
    mockSelectFn.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [] }) }),
    })
    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })
})
