import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetOrgPlan, mockDb } = vi.hoisted(() => ({
  mockGetOrgPlan: vi.fn(),
  mockDb: {
    select: vi.fn(),
  },
}))

vi.mock('./plans', async () => {
  const actual = await vi.importActual<typeof import('./plans')>('./plans')
  return { ...actual, getOrgPlan: mockGetOrgPlan }
})

vi.mock('@/lib/db/client', () => ({ db: mockDb }))

import { assertOrgPlanLimit } from './assertOrgPlanLimit'

describe('assertOrgPlanLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing for enterprise plan (Infinity)', async () => {
    mockGetOrgPlan.mockResolvedValue('enterprise')
    await expect(assertOrgPlanLimit('o1', 'documents')).resolves.toBeUndefined()
  })

  it('throws when documents >= limit', async () => {
    mockGetOrgPlan.mockResolvedValue('starter')
    mockDb.select.mockReturnValueOnce({
      from: () => ({ where: () => [{ value: 10 }] }),
    })
    await expect(assertOrgPlanLimit('o1', 'documents')).rejects.toThrow('PLAN_LIMIT_REACHED')
  })

  it('throws when queries >= limit', async () => {
    mockGetOrgPlan.mockResolvedValue('starter')
    mockDb.select.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => [{ q: 500 }] }) }),
    })
    await expect(assertOrgPlanLimit('o1', 'queries')).rejects.toThrow('PLAN_LIMIT_REACHED')
  })
})
