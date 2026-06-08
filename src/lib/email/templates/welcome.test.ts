import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import { WelcomeEmail } from './welcome'

describe('WelcomeEmail', () => {
  it('renders dashboard link and personalized greeting', async () => {
    const html = await render(
      WelcomeEmail({ dashboardUrl: 'https://app.lexilift.dev/dashboard', name: 'Sam' })
    )
    expect(html).toContain('Sam')
    expect(html).toContain('https://app.lexilift.dev/dashboard')
  })

  it('omits name when not provided', async () => {
    const html = await render(
      WelcomeEmail({ dashboardUrl: 'https://app.lexilift.dev/dashboard' })
    )
    expect(html).not.toContain(', ,')
  })
})
