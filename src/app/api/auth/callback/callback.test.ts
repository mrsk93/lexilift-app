/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExchangeCodeForSession, mockCreateServerClient, mockCookieStore } = vi.hoisted(() => {
  const mockExchangeCodeForSession = vi.fn()
  const mockCreateServerClient = vi.fn().mockImplementation(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  }))
  const mockCookieStore = { getAll: vi.fn().mockReturnValue([]), set: vi.fn() }
  return { mockExchangeCodeForSession, mockCreateServerClient, mockCookieStore }
})

const { mockSelect, mockInsert } = vi.hoisted(() => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  return { mockSelect, mockInsert }
})

vi.mock('@/lib/env', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
    EMAIL_FROM: 'LexiLift <test@test.dev>',
    RESEND_API_KEY: 're_test',
    DATABASE_URL: 'postgresql://test',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon',
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}))

vi.mock('@supabase/ssr', () => ({ createServerClient: mockCreateServerClient }))

vi.mock('@/lib/db/client', () => {
  const chainable = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
  }
  chainable.from.mockReturnValue(chainable)
  chainable.where.mockReturnValue(chainable)
  chainable.limit.mockResolvedValue([])
  chainable.values.mockReturnValue(chainable)
  chainable.returning.mockResolvedValue([{ id: 'org-1' }])
  return {
    db: {
      select: mockSelect.mockReturnValue(chainable),
      insert: mockInsert.mockReturnValue(chainable),
    },
  }
})

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'msg-1' }),
}))

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html>welcome</html>'),
}))

import { GET } from './route'

describe('OAuth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.co', user_metadata: { full_name: 'A', avatar_url: 'x' } } },
      error: null,
    })
  })

  it('redirects to /dashboard when no next param is provided', async () => {
    const r = await GET(new Request('http://localhost:3000/api/auth/callback?code=abc'))
    expect([302, 307]).toContain(r.status)
    expect(r.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('respects an explicit next param', async () => {
    const r = await GET(new Request('http://localhost:3000/api/auth/callback?code=abc&next=/settings'))
    expect(r.headers.get('location')).toBe('http://localhost:3000/settings')
  })

  it('redirects to /login?error=... when no code is provided', async () => {
    const r = await GET(new Request('http://localhost:3000/api/auth/callback'))
    expect(r.headers.get('location')).toBe('http://localhost:3000/login?error=Authentication%20failed')
  })

  it('redirects to /login?error=... on supabase error', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } })
    const r = await GET(new Request('http://localhost:3000/api/auth/callback?code=abc'))
    expect(r.headers.get('location')).toBe('http://localhost:3000/login?error=Authentication%20failed')
  })
})
