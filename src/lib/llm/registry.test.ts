/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { MockOpenAI, MockAnthropic, MockGemini } = vi.hoisted(() => {
  class MockOpenAI {
    modelName = 'gpt-4o'
  }
  class MockAnthropic {
    modelName = 'claude-3-5-sonnet'
  }
  class MockGemini {
    modelName = 'gemini-1.5-pro'
  }
  return { MockOpenAI, MockAnthropic, MockGemini }
})

vi.mock('./adapters', () => ({
  OpenAIAdapter: MockOpenAI,
  AnthropicAdapter: MockAnthropic,
  GeminiAdapter: MockGemini,
}))

import { getLLM, SUPPORTED_MODELS, listSupportedModels } from './registry'
import { MODELS } from './models'

describe('LLM registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLLM', () => {
    it('returns an OpenAIAdapter for gpt-4o', () => {
      const llm = getLLM('gpt-4o')
      expect(llm).toBeInstanceOf(MockOpenAI)
    })

    it('returns an AnthropicAdapter for claude-3-5-sonnet', () => {
      const llm = getLLM('claude-3-5-sonnet')
      expect(llm).toBeInstanceOf(MockAnthropic)
    })

    it('returns a GeminiAdapter for gemini-1.5-pro', () => {
      const llm = getLLM('gemini-1.5-pro')
      expect(llm).toBeInstanceOf(MockGemini)
    })

    it('defaults to gpt-4o when called with no argument', () => {
      const llm = getLLM()
      expect(llm).toBeInstanceOf(MockOpenAI)
    })

    it('falls back to OpenAIAdapter for an unknown model name', () => {
      const llm = getLLM('mystery-model-9000')
      expect(llm).toBeInstanceOf(MockOpenAI)
    })
  })

  describe('SUPPORTED_MODELS / listSupportedModels', () => {
    it('exposes the three supported model ids', () => {
      expect(SUPPORTED_MODELS).toEqual([
        'gpt-4o',
        'claude-3-5-sonnet',
        'gemini-1.5-pro',
      ])
    })

    it('listSupportedModels returns the same list', () => {
      expect(listSupportedModels()).toEqual(SUPPORTED_MODELS)
    })
  })

  describe('MODELS (from models.ts)', () => {
    it('contains at least 3 entries', () => {
      expect(MODELS.length).toBeGreaterThanOrEqual(3)
    })

    it('each entry has an id and a human-readable label', () => {
      for (const m of MODELS) {
        expect(typeof m.id).toBe('string')
        expect(typeof m.label).toBe('string')
        expect(m.label.length).toBeGreaterThan(0)
      }
    })

    it('includes the three supported model ids', () => {
      const ids = MODELS.map((m) => m.id)
      expect(ids).toEqual(expect.arrayContaining([
        'gpt-4o',
        'claude-3-5-sonnet',
        'gemini-1.5-pro',
      ]))
    })
  })
})
