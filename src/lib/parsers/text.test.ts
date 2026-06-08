/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { parseText } from './text'

describe('parseText', () => {
  it('decodes a plain ASCII buffer to its string form', async () => {
    const text = await parseText(Buffer.from('hello', 'utf-8'))
    expect(text).toBe('hello')
  })

  it('decodes multi-byte UTF-8 sequences (accents, emoji)', async () => {
    const text = await parseText(Buffer.from('héllo wörld 🦊', 'utf-8'))
    expect(text).toBe('héllo wörld 🦊')
  })

  it('returns an empty string for an empty buffer', async () => {
    const text = await parseText(Buffer.alloc(0))
    expect(text).toBe('')
  })

  it('preserves whitespace exactly as encoded (no trimming or collapsing)', async () => {
    const text = await parseText(Buffer.from('a  b\tc\nd', 'utf-8'))
    expect(text).toBe('a  b\tc\nd')
  })

  it('preserves NUL bytes (the implementation does not strip control characters)', async () => {
    const text = await parseText(Buffer.from('hello\u0000world', 'utf-8'))
    expect(text).toBe('hello\u0000world')
  })

  it('returns a promise (the function is async)', async () => {
    const result = parseText(Buffer.from('x'))
    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBe('x')
  })
})
