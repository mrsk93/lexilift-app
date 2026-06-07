/**
 * @vitest-environment node
 */
// env validates at import time; mock bypasses that and node env ensures process.env is available
import { describe, it, expect, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

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
  it('returns a singleton client', async () => {
    const c1 = createAdminClient()
    const c2 = createAdminClient()
    expect(c1).toBeDefined()
    expect(c1).toBe(c2)
    expect(createClient).toHaveBeenCalledTimes(1)
  })
})
