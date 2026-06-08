/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignInWithOAuth, mockCreateServerClient, mockCookieStore } = vi.hoisted(() => {
  const mockSignInWithOAuth = vi.fn()
  const mockCreateServerClient = vi.fn().mockImplementation(() => ({
    auth: { signInWithOAuth: mockSignInWithOAuth },
  }))
  const mockCookieStore = { getAll: vi.fn().mockReturnValue([]) }
  return { mockSignInWithOAuth, mockCreateServerClient, mockCookieStore }
})

vi.mock('@/lib/env', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon',
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

vi.mock('@supabase/ssr', () => ({ createServerClient: mockCreateServerClient }))

import { GET } from './route'

describe('Google OAuth init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to Supabase OAuth URL with google provider', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://test.supabase.co/auth/v1/authorize?provider=google&code_challenge=abc' },
      error: null,
    })
    const r = await GET()
    expect([302, 307]).toContain(r.status)
    expect(r.headers.get('location')).toContain('provider=google')
  })

  it('passes next=/dashboard on the callback redirectTo', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://test.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    })
    await GET()
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'http://localhost:3000/api/auth/callback?next=/dashboard',
        }),
      })
    )
  })

  it('returns 500 on supabase error', async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ data: null, error: { message: 'oops' } })
    const r = await GET()
    expect(r.status).toBe(500)
  })
})
