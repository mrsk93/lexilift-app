import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { VOYAGE_API_KEY: '' },
}))

vi.mock('@/lib/env', () => ({ env: mockEnv }))

import { VoyageReranker } from './voyage'

describe('VoyageReranker', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.VOYAGE_API_KEY = ''
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to a mock ranking when no API key is configured', async () => {
    mockEnv.VOYAGE_API_KEY = ''
    const r = new VoyageReranker()
    const out = await r.rerank('query', ['A', 'B', 'C'])

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ index: 0, document: 'A', relevance_score: 0.9 })
    expect(out[1]).toEqual({ index: 1, document: 'B', relevance_score: 0.8 })
    expect(out[2]).toEqual({ index: 2, document: 'C', relevance_score: 0.7 })
  })

  it('calls the Voyage API with the correct shape when an API key is set', async () => {
    mockEnv.VOYAGE_API_KEY = 'sk-voyage-test'
    fetchSpy.mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({
        data: [
          { index: 1, relevance_score: 0.95 },
          { index: 0, relevance_score: 0.4 },
        ],
      }),
    })

    const r = new VoyageReranker()
    const out = await r.rerank('what is RAG?', ['doc-A', 'doc-B'])

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.voyageai.com/v1/rerank')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-voyage-test',
      })
    )
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      query: 'what is RAG?',
      documents: ['doc-A', 'doc-B'],
      model: 'rerank-2.5-lite',
      top_k: 2,
    })
    expect(out).toEqual([
      { index: 1, relevance_score: 0.95 },
      { index: 0, relevance_score: 0.4 },
    ])
  })

  it('caps top_k at 5 in the request body', async () => {
    mockEnv.VOYAGE_API_KEY = 'sk-voyage-test'
    fetchSpy.mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ data: [] }),
    })

    const r = new VoyageReranker()
    await r.rerank('q', ['a', 'b', 'c', 'd', 'e', 'f', 'g'])

    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string)
    expect(body.top_k).toBe(5)
  })

  it('uses the document list length as top_k when there are fewer than 5', async () => {
    mockEnv.VOYAGE_API_KEY = 'sk-voyage-test'
    fetchSpy.mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ data: [] }),
    })

    const r = new VoyageReranker()
    await r.rerank('q', ['a', 'b'])

    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string)
    expect(body.top_k).toBe(2)
  })

  it('returns an empty array when the API responds with no data field', async () => {
    mockEnv.VOYAGE_API_KEY = 'sk-voyage-test'
    fetchSpy.mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({}),
    })

    const r = new VoyageReranker()
    const out = await r.rerank('q', ['a', 'b'])
    expect(out).toEqual([])
  })

  it('falls back to mock ranking when the API returns a non-2xx status', async () => {
    mockEnv.VOYAGE_API_KEY = 'sk-voyage-test'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    })

    const r = new VoyageReranker()
    const out = await r.rerank('q', ['A', 'B'])

    expect(out).toEqual([
      { index: 0, document: 'A', relevance_score: 0.9 },
      { index: 1, document: 'B', relevance_score: 0.8 },
    ])
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('falls back to mock ranking when fetch throws (network error)', async () => {
    mockEnv.VOYAGE_API_KEY = 'sk-voyage-test'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchSpy.mockRejectedValue(new Error('network down'))

    const r = new VoyageReranker()
    const out = await r.rerank('q', ['X', 'Y', 'Z'])

    expect(out).toEqual([
      { index: 0, document: 'X', relevance_score: 0.9 },
      { index: 1, document: 'Y', relevance_score: 0.8 },
      { index: 2, document: 'Z', relevance_score: 0.7 },
    ])
    expect(errorSpy).toHaveBeenCalledWith('Reranking failed', expect.any(Error))
    errorSpy.mockRestore()
  })

  it('getReranker() factory returns a VoyageReranker instance', async () => {
    const { getReranker } = await import('./voyage')
    expect(getReranker()).toBeInstanceOf(VoyageReranker)
  })
})
