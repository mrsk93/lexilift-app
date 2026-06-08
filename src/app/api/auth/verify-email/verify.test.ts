/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockVerifyOtp, mockCreateServerClient, mockCookieStore } = vi.hoisted(() => {
  const mockVerifyOtp = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  const mockCreateServerClient = vi.fn().mockImplementation(() => ({
    auth: { verifyOtp: mockVerifyOtp },
  }))
  const mockCookieStore = { getAll: vi.fn().mockReturnValue([]), set: vi.fn() }
  return { mockVerifyOtp, mockCreateServerClient, mockCookieStore }
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

describe('verify email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('verifies a token', async () => {
    const r = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 't', email: 'a@b.co' }) })
    )
    expect(r.status).toBe(200)
    expect(mockVerifyOtp).toHaveBeenCalled()
  })

  it('returns 400 on invalid input', async () => {
    const r = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 't', email: 'bad' }) })
    )
    expect(r.status).toBe(400)
  })

  it('returns 400 on supabase error', async () => {
    mockVerifyOtp.mockResolvedValueOnce({ data: null, error: { message: 'expired' } })
    const r = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 't', email: 'a@b.co' }) })
    )
    expect(r.status).toBe(400)
  })
})
