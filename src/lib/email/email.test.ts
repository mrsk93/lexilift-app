/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'LexiLift <hello@test.dev>',
    APP_URL: 'http://localhost:3000',
  },
}))

const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn(function MockResend(this: object) {
    Object.assign(this, { emails: { send: mockSend } })
  }),
}))

import { sendEmail } from './send'

describe('sendEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it('returns message id on success', async () => {
    mockSend.mockResolvedValue({ data: { id: 'em_test' }, error: null })
    const id = await sendEmail({
      to: 'user@test.dev',
      subject: 'Hi',
      html: '<p>Hi</p>',
    })
    expect(id).toBe('em_test')
    expect(mockSend).toHaveBeenCalledWith({
      from: 'LexiLift <hello@test.dev>',
      to: 'user@test.dev',
      subject: 'Hi',
      html: '<p>Hi</p>',
      replyTo: undefined,
    })
  })

  it('throws on API error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(
      sendEmail({ to: 'a@test.dev', subject: 'b', html: 'c' }),
    ).rejects.toThrow('boom')
  })

  it('returns null and warns when RESEND_API_KEY is unset', async () => {
    vi.resetModules()
    vi.doMock('@/lib/env', () => ({
      env: { RESEND_API_KEY: undefined, EMAIL_FROM: 'x', APP_URL: 'y' },
    }))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { sendEmail: sendEmailFresh } = await import('./send')
    const id = await sendEmailFresh({ to: 'a@test.dev', subject: 'b', html: 'c' })
    expect(id).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
    vi.doUnmock('@/lib/env')
    vi.resetModules()
  })
})

