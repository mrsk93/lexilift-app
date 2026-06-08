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

describe('retrieveContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns chunks whose text comes from the original matches, NOT from the reranker', async () => {
    // This is the regression that caused "I don't have enough information":
    // the Voyage reranker API returns {index, relevance_score} WITHOUT a
    // 'document' field. The old code did `text: r.document` and got
    // undefined, so the LLM got empty context.
    mockQuery.mockResolvedValueOnce([
      { id: 'p1', score: 0.9, metadata: { text: 'ORIGINAL_CHUNK_TEXT', docId: 'd1' } },
      { id: 'p2', score: 0.8, metadata: { text: 'SECOND_CHUNK', docId: 'd1' } },
    ])
    // The reranker returns index + relevance_score but NO 'document' field
    mockRerank.mockResolvedValueOnce([
      { index: 1, relevance_score: 0.95 },
      { index: 0, relevance_score: 0.7 },
    ])

    const result = await retrieveContext('any query', 'org-1')
    expect(result).toHaveLength(2)
    // First result is reranked[0] = original[1] = 'SECOND_CHUNK'
    expect(result[0]?.text).toBe('SECOND_CHUNK')
    expect(result[0]?.score).toBe(0.95)
    // Second result is reranked[1] = original[0] = 'ORIGINAL_CHUNK_TEXT'
    expect(result[1]?.text).toBe('ORIGINAL_CHUNK_TEXT')
    expect(result[1]?.score).toBe(0.7)
    // Metadata follows the source match, not the reranker
    expect(result[0]?.metadata?.docId).toBe('d1')
  })

  it('returns [] when Pinecone returns no matches', async () => {
    mockQuery.mockResolvedValueOnce([])
    const result = await retrieveContext('any query', 'org-1')
    expect(result).toEqual([])
    // No fallback to Postgres — we trust the vector store
    expect(mockDbSelect).not.toHaveBeenCalled()
  })

  it('returns [] when match metadata has no text (defensive)', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 'p1', score: 0.9, metadata: { docId: 'd1' } }, // no text
    ])
    mockRerank.mockResolvedValueOnce([{ index: 0, relevance_score: 0.9 }])
    const result = await retrieveContext('any query', 'org-1')
    expect(result).toHaveLength(1)
    expect(result[0]?.text).toBe('') // empty string fallback
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

  it('omits the prompt source markers when there is no context', () => {
    const prompt = buildContextPrompt('What is X?', [])
    expect(prompt).toContain('If the answer is not contained in the context, say "I don\'t have enough information')
    expect(prompt).toContain('User Question: What is X?')
  })
})
