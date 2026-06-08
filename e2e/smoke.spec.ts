import { test, expect } from '@playwright/test'

test('production smoke: key public pages return 200', async ({ request }) => {
  for (const path of [
    '/',
    '/api/health',
    '/api/ready',
    '/sitemap.xml',
    '/robots.txt',
    '/login',
    '/signup',
    '/pricing',
    '/help',
    '/terms',
    '/privacy',
    '/dpa',
  ]) {
    const r = await request.get(path)
    expect(r.status(), `${path} should return 200`).toBe(200)
  }
})
