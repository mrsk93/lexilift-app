import { listSupportedModels } from './registry'

const LABELS: Record<string, string> = {
  'gpt-4o': 'GPT-4o',
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
}

export const MODELS = listSupportedModels().map((id) => ({
  id,
  label: LABELS[id] ?? id,
}))

export type ModelId = (typeof MODELS)[number]['id']
