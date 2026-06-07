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

const makeReq = (url: string) =>
  new NextRequest(new Request(url)) as unknown as NextRequest

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
})
