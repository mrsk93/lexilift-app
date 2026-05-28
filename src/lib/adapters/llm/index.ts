import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

export type SupportedModel = 'gpt-4o' | 'claude-3-5-sonnet' | 'gemini-1.5-pro'

export function getLLM(modelName: SupportedModel | string = 'gpt-4o') {
  switch (modelName) {
    case 'claude-3-5-sonnet':
      return anthropic('claude-3-5-sonnet-20241022')
    case 'gemini-1.5-pro':
      return google('gemini-1.5-pro')
    case 'gpt-4o':
    default:
      return openai('gpt-4o')
  }
}
