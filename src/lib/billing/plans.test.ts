/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'

import { PLAN_LIMITS, assertWithinLimit } from './plans-data'

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
