/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({ db: {} }))

import { PLAN_LIMITS, assertWithinLimit } from './plans'

describe('plan limits', () => {
  it('starter has documents=10', () => {
    expect(PLAN_LIMITS.starter.documents).toBe(10)
  })
  it('enterprise widgets=Infinity', () => {
    expect(PLAN_LIMITS.enterprise.widgets).toBe(Infinity)
  })
  it('assertWithinLimit throws over limit', () => {
    expect(() => assertWithinLimit('starter', 'documents', 11)).toThrow('PLAN_LIMIT_REACHED')
  })
})
