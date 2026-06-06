/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([
      {
        id: 'd1',
        orgId: 'o1',
        fileType: 'application/pdf',
        fileUrl: 'https://x/d1.pdf',
        status: 'processing',
      },
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/parsers/pdf', () => ({
  parsePdf: vi.fn().mockResolvedValue('hello world'),
}))
vi.mock('@/lib/langchain/chunking', () => ({
  splitText: vi.fn().mockResolvedValue([{ pageContent: 'hello world' }]),
}))
vi.mock('@/lib/adapters/vector-store/pinecone', () => ({
  getVectorStore: () => ({ upsert: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('@/lib/env', () => ({
  env: { OPENAI_API_KEY: undefined, PINECONE_API_KEY: undefined },
}))

import { parsePdf } from '@/lib/parsers/pdf'
import { splitText } from '@/lib/langchain/chunking'
import { db } from '@/lib/db/client'
import { processDocument } from './processDocument'

describe('processDocument', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        arrayBuffer: async () => new ArrayBuffer(0),
      })
    )
  })

  it('parses, chunks, embeds, upserts, and marks ready', async () => {
    const result = await processDocument.fn({
      event: { data: { docId: 'd1' } },
      step: { run: (_n: string, fn: () => unknown) => fn() },
    } as any)

    expect(result).toMatchObject({ docId: 'd1', chunkCount: 1 })
    expect(parsePdf).toHaveBeenCalled()
    expect(splitText).toHaveBeenCalled()
    expect(db.update).toHaveBeenCalled()
  })
})
