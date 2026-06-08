import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGoogleModel, mockStreamText } = vi.hoisted(() => {
  const mockGoogleModel = vi.fn((modelId: string) => ({
    modelId,
    provider: 'google.generative-ai',
  }))
  const mockStreamText = vi.fn()
  return { mockGoogleModel, mockStreamText }
})

vi.mock('@ai-sdk/google', () => ({
  google: mockGoogleModel,
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
}))

import { GeminiAdapter } from './gemini'

function makeFakeTextStream(chunks: string[]) {
  return (async function* () {
    for (const c of chunks) yield c
  })()
}

describe('GeminiAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamText.mockReturnValue({
      textStream: makeFakeTextStream(['Yo']),
      usage: Promise.resolve({ totalTokens: 7 }),
    })
  })

  it('exposes the modelName as gemini-1.5-pro by default', () => {
    const a = new GeminiAdapter()
    expect(a.modelName).toBe('gemini-1.5-pro')
  })

  it('forwards the chosen model to the google() provider', async () => {
    const a = new GeminiAdapter('gemini-1.5-pro')
    for await (const _chunk of a.stream([{ role: 'user', content: 'go' }])) {
      void _chunk
    }
    expect(mockGoogleModel).toHaveBeenCalledWith('gemini-1.5-pro')
  })

  it('calls streamText with the constructed model and the input messages', async () => {
    const a = new GeminiAdapter()
    const messages = [{ role: 'user' as const, content: 'hi' }]
    for await (const _chunk of a.stream(messages)) {
      void _chunk
    }
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: 'gemini-1.5-pro', provider: 'google.generative-ai' },
        messages,
      })
    )
  })

  it('yields text chunks followed by a finish chunk with totalTokens', async () => {
    const a = new GeminiAdapter()
    const out: Array<{ type: string; text?: string; totalTokens?: number }> = []
    for await (const chunk of a.stream([{ role: 'user', content: 'go' }])) {
      out.push(chunk)
    }
    expect(out[0]).toEqual({ type: 'text', text: 'Yo' })
    const finish = out.find((c) => c.type === 'finish')
    expect(finish?.totalTokens).toBe(7)
  })
})
