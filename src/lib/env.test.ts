/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest'

describe('env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    // @ts-expect-error cache-bust query string for re-import
    await expect(() => import('./env?missing-db')).rejects.toThrow()
  })

  it('exposes typed values when valid', async () => {
    process.env.DATABASE_URL = 'postgresql://x'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    // @ts-expect-error cache-bust query string for re-import
    const { env } = await import('./env?valid')
    expect(env.DATABASE_URL).toBe('postgresql://x')
  })
})
