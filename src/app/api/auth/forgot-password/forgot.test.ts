/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResetPasswordForEmail, mockCreateServerClient, mockCookieStore } = vi.hoisted(() => {
  const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null })
  const mockCreateServerClient = vi.fn().mockImplementation(() => ({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  }))
  const mockCookieStore = { getAll: vi.fn().mockReturnValue([]) }
  return { mockResetPasswordForEmail, mockCreateServerClient, mockCookieStore }
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
}))

vi.mock('@supabase/ssr', () => ({ createServerClient: mockCreateServerClient }))

import { POST } from './route'

describe('forgot password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
  })

  it('returns 200 on success', async () => {
    const r = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'a@b.co' }) })
    )
    expect(r.status).toBe(200)
    expect(mockResetPasswordForEmail).toHaveBeenCalled()
  })

  it('returns 400 on invalid email', async () => {
    const r = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'not-an-email' }) })
    )
    expect(r.status).toBe(400)
  })

  it('returns 400 on supabase error', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ data: null, error: { message: 'rate limit' } })
    const r = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'a@b.co' }) })
    )
    expect(r.status).toBe(400)
  })
})
