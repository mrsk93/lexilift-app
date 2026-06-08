/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { MockPDFParse, mockGetText, mockDestroy } = vi.hoisted(() => {
  const mockGetText = vi.fn()
  const mockDestroy = vi.fn()
  const MockPDFParse = vi.fn(function () {
    return { getText: mockGetText, destroy: mockDestroy }
  })
  return { MockPDFParse, mockGetText, mockDestroy }
})

vi.mock('pdf-parse', () => ({ PDFParse: MockPDFParse }))

import { parsePdf } from './pdf'

describe('parsePdf', () => {
  beforeEach(() => {
    MockPDFParse.mockClear()
    mockGetText.mockReset()
    mockDestroy.mockReset()
    mockDestroy.mockResolvedValue(undefined)
  })

  it('extracts text from a PDF buffer', async () => {
    mockGetText.mockResolvedValue({ text: 'Hello PDF world' })
    const text = await parsePdf(Buffer.from('mock pdf bytes'))
    expect(text).toBe('Hello PDF world')
  })

  it('wraps the input buffer in a Uint8Array for the PDFParse constructor', async () => {
    mockGetText.mockResolvedValue({ text: 'ok' })
    const buffer = Buffer.from('mock pdf bytes')
    await parsePdf(buffer)
    expect(MockPDFParse).toHaveBeenCalledTimes(1)
    const options = MockPDFParse.mock.calls[0]?.at(0) as { data: Uint8Array } | undefined
    expect(options).toBeDefined()
    expect(options?.data).toBeInstanceOf(Uint8Array)
    expect(Buffer.from(options!.data).toString('utf-8')).toBe('mock pdf bytes')
  })

  it('returns an empty string when getText returns no text field', async () => {
    mockGetText.mockResolvedValue({})
    const text = await parsePdf(Buffer.from('x'))
    expect(text).toBe('')
  })

  it('calls destroy() after a successful parse to free resources', async () => {
    mockGetText.mockResolvedValue({ text: 'ok' })
    await parsePdf(Buffer.from('x'))
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('calls destroy() in the finally block even when getText() throws', async () => {
    mockGetText.mockRejectedValue(new Error('malformed PDF'))
    await expect(parsePdf(Buffer.from('x'))).rejects.toThrow(/Failed to parse PDF/)
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('wraps the underlying error with a generic message and does not leak it', async () => {
    mockGetText.mockRejectedValue(new Error('malformed'))
    await expect(parsePdf(Buffer.from('x'))).rejects.toThrow('Failed to parse PDF file.')
    await expect(parsePdf(Buffer.from('x'))).rejects.not.toThrow(/malformed/)
  })

  it('swallows destroy() errors so they do not mask a successful parse', async () => {
    mockGetText.mockResolvedValue({ text: 'ok' })
    mockDestroy.mockRejectedValue(new Error('destroy failed'))
    await expect(parsePdf(Buffer.from('x'))).resolves.toBe('ok')
  })

  it('swallows destroy() errors so they do not mask a parse failure', async () => {
    mockGetText.mockRejectedValue(new Error('parse failed'))
    mockDestroy.mockRejectedValue(new Error('destroy failed'))
    await expect(parsePdf(Buffer.from('x'))).rejects.toThrow('Failed to parse PDF file.')
  })
})
