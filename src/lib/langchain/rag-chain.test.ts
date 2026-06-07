/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQuery, mockRerank, mockDbSelect, mockEnv } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRerank: vi.fn(),
  mockDbSelect: vi.fn(),
  mockEnv: {
    OPENAI_API_KEY: 'test-openai-key',
    PINECONE_API_KEY: 'test-pinecone-key',
  },
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))

vi.mock('@/lib/adapters/vector-store/pinecone', () => ({
  getVectorStore: () => ({ query: mockQuery, upsert: vi.fn(), delete: vi.fn() }),
}))

vi.mock('@/lib/adapters/reranker/voyage', () => ({
  getReranker: () => ({ rerank: mockRerank }),
}))

vi.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: vi.fn(function OpenAIEmbeddings() {
    return {
      embedQuery: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      embedDocuments: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    }
  }),
}))

vi.mock('@/lib/db/client', () => ({ db: { select: mockDbSelect } }))

import { retrieveContext, buildContextPrompt } from './rag-chain'

function buildDbChain(rows: Array<{ id: string; docId: string; content: string; rank: number }>) {
  return {
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  }
}

describe('retrieveContext — Postgres fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the Postgres FTS results when Pinecone returns 0 matches', async () => {
    mockQuery.mockResolvedValueOnce([]) // Pinecone returns nothing
    mockDbSelect.mockImplementationOnce(() =>
      buildDbChain([
        { id: 'c1', docId: 'd1', content: 'Falcon A/B testing platform was launched in November.', rank: 1.5 },
        { id: 'c2', docId: 'd1', content: 'Total of 18 critical bugs were fixed in Phase 1.', rank: 0.8 },
      ])
    )

    const result = await retrieveContext('Falcon summary', 'org-1')
    expect(result).toHaveLength(2)
    expect(result[0]?.text).toContain('Falcon A/B')
    expect(result[0]?.metadata?.docId).toBe('d1')
  })

  it('falls back to Postgres when Pinecone throws (e.g. dead API key)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PineconeAuthorizationError: API key rejected'))
    mockDbSelect.mockImplementationOnce(() =>
      buildDbChain([{ id: 'c1', docId: 'd1', content: 'Some chunk text', rank: 1.0 }])
    )

    const result = await retrieveContext('any query', 'org-1')
    expect(result).toHaveLength(1)
    expect(result[0]?.text).toBe('Some chunk text')
  })

  it('returns [] when both Pinecone and the Postgres fallback return nothing', async () => {
    mockQuery.mockResolvedValueOnce([])
    mockDbSelect.mockImplementationOnce(() => buildDbChain([]))
    const result = await retrieveContext('no results', 'org-1')
    expect(result).toEqual([])
  })

  it('uses Pinecone when it has matches (does not fall back)', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 'p1', score: 0.9, metadata: { text: 'pinecone chunk', docId: 'd1' } },
    ])
    mockRerank.mockResolvedValueOnce([
      { index: 0, document: 'pinecone chunk', relevance_score: 0.9 },
    ])

    const result = await retrieveContext('test', 'org-1')
    expect(result).toHaveLength(1)
    expect(result[0]?.text).toBe('pinecone chunk')
    expect(mockDbSelect).not.toHaveBeenCalled()
  })
})

describe('buildContextPrompt', () => {
  it('produces a prompt with citation markers and the context', () => {
    const prompt = buildContextPrompt('What is X?', [
      { text: 'X is a thing', score: 0.9, metadata: { docId: 'd1' } },
    ])
    expect(prompt).toContain('[Source 1 | Doc: d1]')
    expect(prompt).toContain('X is a thing')
    expect(prompt).toContain('What is X?')
  })
})
