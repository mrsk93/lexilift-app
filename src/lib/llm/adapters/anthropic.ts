import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import type { StreamingLLMAdapter, StreamChunk } from '../streaming-adapter'

const MODEL_IDS: Record<'claude-3-5-sonnet', string> = {
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
}

export class AnthropicAdapter implements StreamingLLMAdapter {
  readonly modelName: 'claude-3-5-sonnet'
  constructor(private model: 'claude-3-5-sonnet' = 'claude-3-5-sonnet') {
    this.modelName = model
  }

  async *stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk> {
    const result = streamText({ model: anthropic(MODEL_IDS[this.model]), messages })
    for await (const chunk of result.textStream) {
      yield { type: 'text', text: chunk }
    }
    const usage = await result.usage
    yield { type: 'finish', totalTokens: usage.totalTokens }
  }
}
