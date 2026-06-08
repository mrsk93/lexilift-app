import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockUpdateSession = vi.fn()
vi.mock('@/lib/auth/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

import { proxy } from './proxy'

const makeReq = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(new Request(url, { headers })) as unknown as NextRequest

describe('proxy', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockUpdateSession.mockReset()
    mockUpdateSession.mockImplementation(async () => {
      const res = new Response(null, { headers: new Headers() }) as Response & { _user?: unknown }
      res._user = await mockGetUser()
      return res
    })
  })

  it('redirects unauthenticated users from /dashboard', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(makeReq('http://localhost/dashboard'))
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows access to /login', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(makeReq('http://localhost/login'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('allows /widget/* and /api/widget/* without auth', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(makeReq('http://localhost/widget/abc'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('allows /api/ready/* without auth', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(makeReq('http://localhost/api/ready'))
    expect(res.headers.get('location')).toBeNull()
  })

  it.each(['/terms', '/privacy', '/dpa'])('allows %s without auth', async (path) => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(makeReq(`http://localhost${path}`))
    expect(res.headers.get('location')).toBeNull()
  })

  it('sets x-request-id header on response', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(makeReq('http://localhost/login'))
    const id = res.headers.get('x-request-id')
    expect(id).toMatch(/^[0-9a-f]{16}$/)
  })

  it('reuses inbound x-request-id header if present', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await proxy(
      makeReq('http://localhost/login', { 'x-request-id': 'inbound-id-123' })
    )
    expect(res.headers.get('x-request-id')).toBe('inbound-id-123')
  })

  it('forwards x-request-id to updateSession via the upstream request', async () => {
    mockGetUser.mockResolvedValue(null)
    await proxy(
      makeReq('http://localhost/login', { 'x-request-id': 'upstream-id-456' })
    )
    expect(mockUpdateSession).toHaveBeenCalledTimes(1)
    const forwarded = mockUpdateSession.mock.calls[0][0] as NextRequest
    expect(forwarded.headers.get('x-request-id')).toBe('upstream-id-456')
  })

  it('generates and forwards a new x-request-id when none is inbound', async () => {
    mockGetUser.mockResolvedValue(null)
    await proxy(makeReq('http://localhost/login'))
    expect(mockUpdateSession).toHaveBeenCalledTimes(1)
    const forwarded = mockUpdateSession.mock.calls[0][0] as NextRequest
    expect(forwarded.headers.get('x-request-id')).toMatch(/^[0-9a-f]{16}$/)
  })
})
