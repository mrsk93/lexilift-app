import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAnthropicModel, mockStreamText } = vi.hoisted(() => {
  const mockAnthropicModel = vi.fn((modelId: string) => ({
    modelId,
    provider: 'anthropic.messages',
  }))
  const mockStreamText = vi.fn()
  return { mockAnthropicModel, mockStreamText }
})

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: mockAnthropicModel,
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
}))

import { AnthropicAdapter } from './anthropic'

function makeFakeTextStream(chunks: string[]) {
  return (async function* () {
    for (const c of chunks) yield c
  })()
}

describe('AnthropicAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamText.mockReturnValue({
      textStream: makeFakeTextStream(['Hi', ' there']),
      usage: Promise.resolve({ totalTokens: 17 }),
    })
  })

  it('exposes the modelName as claude-3-5-sonnet by default', () => {
    const a = new AnthropicAdapter()
    expect(a.modelName).toBe('claude-3-5-sonnet')
  })

  it('uses the dated Claude 3.5 Sonnet model id (claude-3-5-sonnet-20241022)', async () => {
    const a = new AnthropicAdapter()
    for await (const _chunk of a.stream([{ role: 'user', content: 'go' }])) {
      void _chunk
    }
    expect(mockAnthropicModel).toHaveBeenCalledWith('claude-3-5-sonnet-20241022')
  })

  it('calls streamText with the constructed model and the input messages', async () => {
    const a = new AnthropicAdapter()
    const messages = [{ role: 'user' as const, content: 'Hello' }]
    for await (const _chunk of a.stream(messages)) {
      void _chunk
    }
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: 'claude-3-5-sonnet-20241022', provider: 'anthropic.messages' },
        messages,
      })
    )
  })

  it('yields a text chunk for each token emitted by the stream', async () => {
    const a = new AnthropicAdapter()
    const out: Array<{ type: string; text?: string }> = []
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      out.push(chunk)
    }
    expect(out.filter((c) => c.type === 'text').map((c) => c.text)).toEqual(['Hi', ' there'])
  })

  it('yields a finish chunk with totalTokens from the awaited usage', async () => {
    const a = new AnthropicAdapter()
    let finish: { type: string; totalTokens?: number } | undefined
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      if (chunk.type === 'finish') finish = chunk
    }
    expect(finish?.totalTokens).toBe(17)
  })
})
