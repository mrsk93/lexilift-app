/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { EMBEDDING_DIMENSION: 1536 },
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))

import {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  openAIEmbeddingOptions,
  makeMockEmbedding,
} from './embeddings'

describe('embedding config', () => {
  beforeEach(() => {
    mockEnv.EMBEDDING_DIMENSION = 1536
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('exports the configured dimension', () => {
    expect(EMBEDDING_DIMENSION).toBe(1536)
  })

  it('uses OpenAI text-embedding-3-small', () => {
    expect(EMBEDDING_MODEL).toBe('text-embedding-3-small')
  })

  it('forwards the dimension to the OpenAI adapter options', () => {
    expect(openAIEmbeddingOptions).toEqual({
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
    })
  })

  it('builds a mock embedding of the configured length', () => {
    const v = makeMockEmbedding()
    expect(v).toHaveLength(1536)
    expect(v[0]).toBe(0.1)
  })

  it('honors a non-default dimension from env', async () => {
    mockEnv.EMBEDDING_DIMENSION = 1024
    const mod = await import('./embeddings')
    const v = mod.makeMockEmbedding()
    expect(v).toHaveLength(1024)
    expect(mod.EMBEDDING_DIMENSION).toBe(1024)
    expect(mod.openAIEmbeddingOptions.dimensions).toBe(1024)
  })
})
