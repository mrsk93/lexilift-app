export type StreamChunk = { type: 'text'; text: string } | { type: 'finish'; totalTokens?: number }

export interface StreamingLLMAdapter {
  readonly modelName: string
  stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk>
}
