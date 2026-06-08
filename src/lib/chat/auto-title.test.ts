import { describe, it, expect } from 'vitest'
import { deriveTitle } from './auto-title'

describe('deriveTitle', () => {
  it('returns a trimmed short message as-is', () => {
    expect(deriveTitle('Hello there')).toBe('Hello there')
  })

  it('collapses internal whitespace', () => {
    expect(deriveTitle('  hello   world  ')).toBe('hello world')
  })

  it('truncates long messages with ellipsis', () => {
    const long = 'a'.repeat(120)
    const out = deriveTitle(long)
    expect(out.length).toBeLessThanOrEqual(61)
    expect(out.endsWith('…')).toBe(true)
  })

  it('avoids splitting a word when last space is past 30 chars', () => {
    const text = 'word '.repeat(20)
    const out = deriveTitle(text)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.includes('  ')).toBe(false)
  })

  it('returns "New chat" for empty input', () => {
    expect(deriveTitle('')).toBe('New chat')
    expect(deriveTitle('   ')).toBe('New chat')
  })
})
