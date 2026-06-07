import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import { PasswordResetEmail } from './password-reset'

describe('PasswordResetEmail', () => {
  it('renders the reset link and expiry', async () => {
    const html = await render(
      PasswordResetEmail({ resetUrl: 'https://app/reset?token=abc' })
    )
    expect(html).toContain('Reset your LexiLift password')
    expect(html).toContain('https://app/reset?token=abc')
    expect(html).toContain('60')
    expect(html).toContain('minutes')
  })
})
