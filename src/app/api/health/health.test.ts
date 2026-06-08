import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const r = await GET()
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.status).toBe('ok')
    expect(typeof body.uptime).toBe('number')
  })
})
