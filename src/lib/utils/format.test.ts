import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatNumber } from './format'

describe('formatDate', () => {
  it('formats a Date with en-US locale and UTC timezone (deterministic across server/client)', () => {
    const d = new Date('2026-06-07T12:00:00Z')
    expect(formatDate(d)).toBe('Jun 7, 2026')
  })

  it('accepts an ISO string', () => {
    expect(formatDate('2026-01-15T00:00:00Z')).toBe('Jan 15, 2026')
  })

  it('returns the fallback for null/undefined/invalid input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatDate(null, 'N/A')).toBe('N/A')
  })
})

describe('formatDateTime', () => {
  it('includes time', () => {
    const d = new Date('2026-06-07T15:30:00Z')
    expect(formatDateTime(d)).toMatch(/Jun 7, 2026/)
    expect(formatDateTime(d)).toMatch(/3:30/)
  })
})

describe('formatNumber', () => {
  it('uses en-US grouping', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})
