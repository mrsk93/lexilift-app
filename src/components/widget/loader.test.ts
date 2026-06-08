import { describe, it, expect } from 'vitest'
import { buildLoaderScript } from './WidgetLoader'

describe('buildLoaderScript', () => {
  it('embeds the token and origin', () => {
    const s = buildLoaderScript('tokABC', 'https://app.lexilift.dev')
    expect(s).toContain('tokABC')
    expect(s).toContain('https://app.lexilift.dev')
  })
  it('is valid JS (parses with new Function)', () => {
    const s = buildLoaderScript('t', 'o')
    expect(() => new Function(s)).not.toThrow()
  })
})
