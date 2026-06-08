/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import type { StreamingLLMAdapter, StreamChunk } from './streaming-adapter'
import { OpenAIAdapter } from './adapters/openai'
import { AnthropicAdapter } from './adapters/anthropic'
import { GeminiAdapter } from './adapters/gemini'

const { mockStreamText } = vi.hoisted(() => ({
  mockStreamText: vi.fn(),
}))

vi.mock('ai', () => ({
  streamText: mockStreamText,
}))

function makeFakeTextStream(chunks: string[]) {
  return (async function* () {
    for (const c of chunks) yield c
  })()
}

function consume(adapter: StreamingLLMAdapter, input: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  const out: StreamChunk[] = []
  const collect = (async () => {
    for await (const chunk of adapter.stream(input)) {
      out.push(chunk)
    }
  })()
  return { out, collect }
}

describe('StreamingLLMAdapter contract', () => {
  it('every concrete adapter satisfies the StreamingLLMAdapter interface', () => {
    const adapters: StreamingLLMAdapter[] = [
      new OpenAIAdapter(),
      new AnthropicAdapter(),
      new GeminiAdapter(),
    ]
    for (const a of adapters) {
      expect(typeof a.modelName).toBe('string')
      expect(a.modelName.length).toBeGreaterThan(0)
      expect(typeof a.stream).toBe('function')
    }
  })

  it('text chunks carry the emitted token text and finish chunks carry totalTokens', async () => {
    mockStreamText.mockReturnValueOnce({
      textStream: makeFakeTextStream(['A', 'B', 'C']),
      usage: Promise.resolve({ totalTokens: 99 }),
    })

    const adapter = new OpenAIAdapter()
    const { out, collect } = consume(adapter, [{ role: 'user', content: 'go' }])
    await collect

    const textChunks = out.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    const finishChunks = out.filter((c): c is { type: 'finish'; totalTokens?: number } => c.type === 'finish')

    expect(textChunks.map((c) => c.text)).toEqual(['A', 'B', 'C'])
    expect(finishChunks).toHaveLength(1)
    expect(finishChunks[0]?.totalTokens).toBe(99)
  })

  it('emits exactly one finish chunk per stream call', async () => {
    mockStreamText.mockReturnValueOnce({
      textStream: makeFakeTextStream(['x']),
      usage: Promise.resolve({ totalTokens: 1 }),
    })

    const adapter = new OpenAIAdapter()
    const { out, collect } = consume(adapter, [{ role: 'user', content: 'go' }])
    await collect

    const finishCount = out.filter((c) => c.type === 'finish').length
    expect(finishCount).toBe(1)
  })

  it('passes totalTokens=0 when the SDK reports no usage', async () => {
    mockStreamText.mockReturnValueOnce({
      textStream: makeFakeTextStream(['y']),
      usage: Promise.resolve({ totalTokens: 0 }),
    })

    const adapter = new OpenAIAdapter()
    const { out, collect } = consume(adapter, [{ role: 'user', content: 'go' }])
    await collect

    const finish = out.find((c) => c.type === 'finish')
    expect(finish).toBeDefined()
    expect(finish && finish.type === 'finish' ? finish.totalTokens : undefined).toBe(0)
  })
})
