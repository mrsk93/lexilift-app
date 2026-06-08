import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@/lib/auth/supabase/middleware', () => ({
  updateSession: vi.fn(async (req: any) => {
    const user = await mockGetUser()
    const res = new Response(null, { headers: new Headers() })
    ;(res as any)._user = user
    return res
  }),
}))

import { proxy } from './proxy'

const makeReq = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(new Request(url, { headers })) as unknown as NextRequest

describe('proxy', () => {
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
})
