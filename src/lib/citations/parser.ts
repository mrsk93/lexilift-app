import type { CitationRef, ParsedAnswer } from './types'

export function parseCitations(
  raw: string,
  chunks: { id: string; documentId: string }[]
): ParsedAnswer {
  const seen = new Map<number, CitationRef>()
  const text = raw
    .replace(/\[(\d+)\]/g, (m, n) => {
      const idx = Number(n)
      if (idx >= 1 && idx <= chunks.length) {
        const c = chunks[idx - 1]
        if (!seen.has(idx)) {
          seen.set(idx, { index: idx, documentId: c.documentId, chunkId: c.id })
        }
        return ''
      }
      return m
    })
    .trim()

  const citations = [...seen.values()].sort((a, b) => a.index - b.index)
  return { text, citations }
}
