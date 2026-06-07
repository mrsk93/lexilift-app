import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { StreamingLLMAdapter, StreamChunk } from '../streaming-adapter'

export class OpenAIAdapter implements StreamingLLMAdapter {
  readonly modelName: 'gpt-4o'
  constructor(private model: 'gpt-4o' = 'gpt-4o') {
    this.modelName = model
  }

  async *stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk> {
    const result = streamText({ model: openai(this.model), messages })
    for await (const chunk of result.textStream) {
      yield { type: 'text', text: chunk }
    }
    const usage = await result.usage
    yield { type: 'finish', totalTokens: usage.totalTokens }
  }
}
