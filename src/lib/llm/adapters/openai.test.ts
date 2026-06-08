import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOpenAIModel, mockStreamText } = vi.hoisted(() => {
  const mockOpenAIModel = vi.fn((modelId: string) => ({
    modelId,
    provider: 'openai.chat',
  }))
  const mockStreamText = vi.fn()
  return { mockOpenAIModel, mockStreamText }
})

vi.mock('@ai-sdk/openai', () => ({
  openai: mockOpenAIModel,
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
}))

import { OpenAIAdapter } from './openai'

function makeFakeTextStream(chunks: string[]) {
  return (async function* () {
    for (const c of chunks) yield c
  })()
}

describe('OpenAIAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamText.mockReturnValue({
      textStream: makeFakeTextStream(['Hello', ' world', '!']),
      usage: Promise.resolve({ totalTokens: 42 }),
    })
  })

  it('exposes the modelName as gpt-4o by default', () => {
    const a = new OpenAIAdapter()
    expect(a.modelName).toBe('gpt-4o')
  })

  it('forwards the chosen model to the openai() provider', async () => {
    const a = new OpenAIAdapter('gpt-4o')
    for await (const _chunk of a.stream([{ role: 'user', content: 'hi' }])) {
      void _chunk
    }
    expect(mockOpenAIModel).toHaveBeenCalledWith('gpt-4o')
  })

  it('calls streamText with the constructed model and the input messages', async () => {
    const a = new OpenAIAdapter()
    const messages = [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'Say hi' },
    ]
    for await (const _chunk of a.stream(messages)) {
      void _chunk
    }
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: 'gpt-4o', provider: 'openai.chat' },
        messages,
      })
    )
  })

  it('yields a text chunk for each token emitted by the stream', async () => {
    const a = new OpenAIAdapter()
    const out: Array<{ type: string; text?: string }> = []
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      out.push(chunk)
    }
    const textChunks = out.filter((c) => c.type === 'text')
    expect(textChunks.map((c) => c.text)).toEqual(['Hello', ' world', '!'])
  })

  it('yields a finish chunk with the awaited usage.totalTokens', async () => {
    const a = new OpenAIAdapter()
    const out: Array<{ type: string; totalTokens?: number }> = []
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      out.push(chunk)
    }
    const finish = out.find((c) => c.type === 'finish')
    expect(finish).toBeDefined()
    expect(finish?.totalTokens).toBe(42)
  })

  it('emits exactly one finish chunk per stream call', async () => {
    const a = new OpenAIAdapter()
    let finishCount = 0
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      if (chunk.type === 'finish') finishCount++
    }
    expect(finishCount).toBe(1)
  })

  it('passes totalTokens=0 when the SDK reports no usage', async () => {
    mockStreamText.mockReturnValueOnce({
      textStream: makeFakeTextStream(['x']),
      usage: Promise.resolve({ totalTokens: 0 }),
    })
    const a = new OpenAIAdapter()
    let finish: { type: string; totalTokens?: number } | undefined
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      if (chunk.type === 'finish') finish = chunk
    }
    expect(finish?.totalTokens).toBe(0)
  })
})
