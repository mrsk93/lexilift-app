/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { fetchAndParseUrl } from './url'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchAndParseUrl', () => {
  it('strips HTML and returns plain text', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve('<html><body><h1>Hi</h1><p>Hello world</p><script>bad</script></body></html>'),
    })
    const out = await fetchAndParseUrl('https://example.com')
    expect(out.text).toContain('Hello world')
    expect(out.text).not.toContain('<h1>')
    expect(out.text).not.toContain('bad')
  })

  it('extracts the page title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve('<html><head><title>My Page</title></head><body><p>Body</p></body></html>'),
    })
    const out = await fetchAndParseUrl('https://example.com')
    expect(out.title).toBe('My Page')
  })

  it('throws on non-http protocols', async () => {
    await expect(fetchAndParseUrl('file:///etc/passwd')).rejects.toThrow(/UNSUPPORTED_PROTOCOL|protocol/i)
  })

  it('throws on non-2xx status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      text: () => Promise.resolve(''),
    })
    await expect(fetchAndParseUrl('https://example.com/missing')).rejects.toThrow(/404|HTTP/i)
  })
})
