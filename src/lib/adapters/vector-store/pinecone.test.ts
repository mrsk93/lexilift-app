/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpsert } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
}))

const { mockIndex, mockNamespace } = vi.hoisted(() => {
  const mockIndex = vi.fn(() => ({ namespace: mockNamespace }))
  const mockNamespace = vi.fn(() => ({ upsert: mockUpsert }))
  return { mockIndex, mockNamespace }
})

vi.mock('@/lib/env', () => ({
  env: {
    PINECONE_API_KEY: 'test-key',
    PINECONE_INDEX: 'test-index',
  },
}))

vi.mock('@pinecone-database/pinecone', () => ({
  // Use a regular function (not arrow) so `new Pinecone(...)` works
  Pinecone: vi.fn(function Pinecone(this: unknown) {
    return { index: mockIndex }
  }),
}))

import { PineconeAdapter } from './pinecone'

describe('PineconeAdapter.upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue(undefined)
  })

  it('calls index.upsert with the { records, namespace } options shape, NOT a raw array', async () => {
    const adapter = new PineconeAdapter()
    await adapter.upsert(
      [
        {
          id: 'a',
          text: 'hello',
          metadata: { embedding: [0.1, 0.2, 0.3], docId: 'd1', chunkIndex: 0 },
        },
        {
          id: 'b',
          text: 'world',
          metadata: { embedding: [0.4, 0.5, 0.6], docId: 'd1', chunkIndex: 1 },
        },
      ],
      'org-123'
    )

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const call = mockUpsert.mock.calls[0]?.[0]
    expect(call).toEqual({
      records: [
        { id: 'a', values: [0.1, 0.2, 0.3], metadata: { text: 'hello', docId: 'd1', chunkIndex: 0 } },
        { id: 'b', values: [0.4, 0.5, 0.6], metadata: { text: 'world', docId: 'd1', chunkIndex: 1 } },
      ],
      namespace: 'org-123',
    })
    // Critical: the call shape must be an object with `records` (not a raw array)
    expect(Array.isArray(call)).toBe(false)
    expect(call.records).toBeDefined()
    expect(Array.isArray(call.records)).toBe(true)
  })

  it('removes the embedding from the metadata sent to Pinecone (saves space)', async () => {
    const adapter = new PineconeAdapter()
    await adapter.upsert(
      [
        {
          id: 'a',
          text: 'hello',
          metadata: { embedding: [0.1, 0.2, 0.3], docId: 'd1' },
        },
      ],
      'org-1'
    )

    const sent = mockUpsert.mock.calls[0]?.[0]?.records?.[0]
    expect(sent.values).toEqual([0.1, 0.2, 0.3])
    expect(sent.metadata).not.toHaveProperty('embedding')
  })

  it('passes the namespace both to .namespace() and inside the upsert call', async () => {
    const adapter = new PineconeAdapter()
    await adapter.upsert(
      [{ id: 'a', text: 'x', metadata: { embedding: [0.1] } }],
      'org-xyz'
    )

    expect(mockNamespace).toHaveBeenCalledWith('org-xyz')
    expect(mockUpsert.mock.calls[0]?.[0]?.namespace).toBe('org-xyz')
  })

  it('batches more than 100 records into multiple upsert calls', async () => {
    const adapter = new PineconeAdapter()
    const chunks = Array.from({ length: 250 }, (_, i) => ({
      id: `c${i}`,
      text: `t${i}`,
      metadata: { embedding: [0.1], docId: 'd1' },
    }))
    await adapter.upsert(chunks, 'org-1')

    expect(mockUpsert).toHaveBeenCalledTimes(3)
    expect(mockUpsert.mock.calls[0]?.[0]?.records).toHaveLength(100)
    expect(mockUpsert.mock.calls[1]?.[0]?.records).toHaveLength(100)
    expect(mockUpsert.mock.calls[2]?.[0]?.records).toHaveLength(50)
  })
})
