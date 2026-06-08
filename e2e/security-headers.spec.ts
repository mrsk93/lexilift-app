import { test, expect } from '@playwright/test'

test('public page sets security headers', async ({ request }) => {
  const r = await request.get('/')
  expect(r.headers()['x-frame-options']).toBe('DENY')
  expect(r.headers()['x-content-type-options']).toBe('nosniff')
  expect(r.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(r.headers()['strict-transport-security']).toContain('max-age=')
})
