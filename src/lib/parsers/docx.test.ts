/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExtractRawText } = vi.hoisted(() => ({
  mockExtractRawText: vi.fn(),
}))

vi.mock('mammoth', () => ({
  default: { extractRawText: mockExtractRawText },
}))

import { parseDocx } from './docx'

describe('parseDocx', () => {
  beforeEach(() => {
    mockExtractRawText.mockReset()
  })

  it('extracts text from a DOCX buffer', async () => {
    mockExtractRawText.mockResolvedValue({ value: 'Hello DOCX world', messages: [] })
    const text = await parseDocx(Buffer.from('mock docx bytes'))
    expect(text).toBe('Hello DOCX world')
  })

  it('forwards the buffer to mammoth.extractRawText', async () => {
    mockExtractRawText.mockResolvedValue({ value: 'ok', messages: [] })
    const buffer = Buffer.from('mock docx bytes')
    await parseDocx(buffer)
    expect(mockExtractRawText).toHaveBeenCalledTimes(1)
    expect(mockExtractRawText).toHaveBeenCalledWith({ buffer })
  })

  it('returns the value field verbatim, including empty strings', async () => {
    mockExtractRawText.mockResolvedValue({ value: '', messages: [] })
    const text = await parseDocx(Buffer.from('x'))
    expect(text).toBe('')
  })

  it('wraps the underlying error with a generic message', async () => {
    mockExtractRawText.mockRejectedValue(new Error('not a docx'))
    await expect(parseDocx(Buffer.from('x'))).rejects.toThrow('Failed to parse DOCX file.')
  })

  it('does not leak the underlying error message to the caller', async () => {
    mockExtractRawText.mockRejectedValue(new Error('secret internal detail'))
    await expect(parseDocx(Buffer.from('x'))).rejects.not.toThrow(/secret internal detail/)
  })
})
