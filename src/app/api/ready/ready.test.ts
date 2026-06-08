import { describe, it, expect, vi } from 'vitest'

const mockExecute = vi.fn()

vi.mock('@/lib/db/client', () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

import { GET } from './route'

describe('GET /api/ready', () => {
  it('returns 200 with status ready when DB is reachable', async () => {
    mockExecute.mockResolvedValueOnce([{ '?column?': 1 }])
    const r = await GET()
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.status).toBe('ready')
    expect(body.checks.db).toBe('ok')
  })

  it('returns 503 with status degraded when DB is unreachable', async () => {
    mockExecute.mockRejectedValueOnce(new Error('connection refused'))
    const r = await GET()
    expect(r.status).toBe(503)
    const body = await r.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.db).toBe('fail')
  })
})
