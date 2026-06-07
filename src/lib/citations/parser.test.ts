import { describe, it, expect } from 'vitest'
import { parseCitations } from './parser'

describe('parseCitations', () => {
  it('extracts [1], [2] markers and returns cleaned text + citations', () => {
    const chunks = [
      { id: 'c1', documentId: 'd1' },
      { id: 'c2', documentId: 'd1' },
    ]
    const out = parseCitations('Hello world [1]. See also [2].', chunks)
    expect(out.text).toBe('Hello world . See also .')
    expect(out.citations).toEqual([
      { index: 1, documentId: 'd1', chunkId: 'c1' },
      { index: 2, documentId: 'd1', chunkId: 'c2' },
    ])
  })

  it('deduplicates repeated indices', () => {
    const out = parseCitations('A [1] B [1]', [{ id: 'c1', documentId: 'd1' }])
    expect(out.citations).toHaveLength(1)
    expect(out.citations[0]).toEqual({ index: 1, documentId: 'd1', chunkId: 'c1' })
  })

  it('keeps markers outside the chunk range as plain text', () => {
    const out = parseCitations('A [99]', [{ id: 'c1', documentId: 'd1' }])
    expect(out.text).toBe('A [99]')
    expect(out.citations).toEqual([])
  })

  it('returns empty citations for input with no markers', () => {
    const out = parseCitations('just plain text', [{ id: 'c1', documentId: 'd1' }])
    expect(out.text).toBe('just plain text')
    expect(out.citations).toEqual([])
  })

  it('sorts citations by index ascending', () => {
    const chunks = [
      { id: 'c1', documentId: 'd1' },
      { id: 'c2', documentId: 'd2' },
      { id: 'c3', documentId: 'd3' },
    ]
    const out = parseCitations('See [3] and [1] and [2].', chunks)
    expect(out.citations.map((c) => c.index)).toEqual([1, 2, 3])
  })
})
