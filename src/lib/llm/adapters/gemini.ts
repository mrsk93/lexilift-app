import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import type { StreamingLLMAdapter, StreamChunk } from '../streaming-adapter'

export class GeminiAdapter implements StreamingLLMAdapter {
  readonly modelName: 'gemini-1.5-pro'
  constructor(private model: 'gemini-1.5-pro' = 'gemini-1.5-pro') {
    this.modelName = model
  }

  async *stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk> {
    const result = streamText({ model: google(this.model), messages })
    for await (const chunk of result.textStream) {
      yield { type: 'text', text: chunk }
    }
    const usage = await result.usage
    yield { type: 'finish', totalTokens: usage.totalTokens }
  }
}
