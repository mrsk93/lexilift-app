import { describe, it, expect, vi } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: { update: vi.fn(() => ({ set: () => ({ where: () => undefined }) })) },
}))

vi.mock('@/lib/db/client', () => ({ db: mockDb }))

import { incrementUsage, resetOrgUsage } from './usage'

describe('usage tracking', () => {
  it('incrementUsage calls db.update', async () => {
    await incrementUsage('o1')
    expect(mockDb.update).toHaveBeenCalled()
  })
  it('resetOrgUsage calls db.update', async () => {
    await resetOrgUsage('o1')
    expect(mockDb.update).toHaveBeenCalled()
  })
})
