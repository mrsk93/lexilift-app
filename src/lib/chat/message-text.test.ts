import { describe, it, expect } from 'vitest'
import { getMessageText } from './message-text'

describe('getMessageText', () => {
  it('returns flat content (v2/v3 shape)', () => {
    expect(getMessageText({ content: 'hello' })).toBe('hello')
  })

  it('returns empty string for null/undefined', () => {
    expect(getMessageText(null)).toBe('')
    expect(getMessageText(undefined)).toBe('')
  })

  it('returns empty string for empty object', () => {
    expect(getMessageText({})).toBe('')
  })

  it('joins all text parts (v6 shape)', () => {
    const msg = {
      parts: [
        { type: 'text', text: 'hello ' },
        { type: 'text', text: 'world' },
      ],
    }
    expect(getMessageText(msg)).toBe('hello world')
  })

  it('ignores non-text parts', () => {
    const msg = {
      parts: [
        { type: 'text', text: 'visible' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { type: 'file' as any, text: 'should be ignored' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { type: 'tool-call' as any },
      ],
    }
    expect(getMessageText(msg)).toBe('visible')
  })

  it('prefers content over parts when both are present (legacy first)', () => {
    const msg = {
      content: 'from content',
      parts: [{ type: 'text', text: 'from parts' }],
    }
    expect(getMessageText(msg)).toBe('from content')
  })

  it('skips text parts with empty/undefined text', () => {
    const msg = {
      parts: [
        { type: 'text' }, // no text
        { type: 'text', text: '' },
        { type: 'text', text: 'real' },
      ],
    }
    expect(getMessageText(msg)).toBe('real')
  })
})
