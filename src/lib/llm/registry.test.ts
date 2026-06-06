import { describe, it, expect } from 'vitest'
import { getLLM, listSupportedModels } from './registry'

describe('LLM registry', () => {
  it('lists supported models', () => {
    expect(listSupportedModels()).toContain('gpt-4o')
    expect(listSupportedModels()).toContain('claude-3-5-sonnet')
  })

  it('returns an adapter with a stream() method', () => {
    const adapter = getLLM('gpt-4o')
    expect(typeof adapter.stream).toBe('function')
    expect(adapter.modelName).toBe('gpt-4o')
  })

  it('falls back to gpt-4o for unknown model names', () => {
    const adapter = getLLM('nonsense')
    expect(adapter.modelName).toBe('gpt-4o')
  })
})
