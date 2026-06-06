/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ tag: 'admin' })),
}))

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
  },
}))

import { createAdminClient } from './admin'

describe('createAdminClient', () => {
  it('uses the service role key', async () => {
    const c = createAdminClient()
    expect(c).toBeDefined()
  })
})
