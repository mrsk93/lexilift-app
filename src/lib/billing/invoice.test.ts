import { describe, it, expect } from 'vitest'
import { formatAmount } from './invoice'

describe('formatAmount', () => {
  it('formats cents to USD', () => {
    expect(formatAmount(4900, 'USD')).toBe('$49.00')
  })
  it('handles zero', () => {
    expect(formatAmount(0, 'USD')).toBe('$0.00')
  })
  it('handles other currencies', () => {
    expect(formatAmount(1000, 'EUR')).toMatch(/€?10\.00|10,00/)
  })
})
