import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import { InviteEmail } from './invite'

describe('InviteEmail', () => {
  it('renders the org name and accept link', async () => {
    const html = await render(
      InviteEmail({ orgName: 'Acme', inviterName: 'Sam', acceptUrl: 'https://app/x' })
    )
    expect(html).toContain('Acme')
    expect(html).toContain('Sam')
    expect(html).toContain('https://app/x')
  })
})
