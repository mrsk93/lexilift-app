import type { StreamingLLMAdapter } from './streaming-adapter'
import { OpenAIAdapter, AnthropicAdapter, GeminiAdapter } from './adapters'

export const SUPPORTED_MODELS = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'] as const
export type SupportedModel = (typeof SUPPORTED_MODELS)[number]

export function listSupportedModels(): readonly SupportedModel[] {
  return SUPPORTED_MODELS
}

export function getLLM(modelName: string = 'gpt-4o'): StreamingLLMAdapter {
  switch (modelName) {
    case 'claude-3-5-sonnet': return new AnthropicAdapter()
    case 'gemini-1.5-pro': return new GeminiAdapter()
    case 'gpt-4o':
    default: return new OpenAIAdapter()
  }
}
