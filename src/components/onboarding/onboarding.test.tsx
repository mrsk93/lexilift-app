import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}))

import { OnboardingWizard } from './OnboardingWizard'

describe('OnboardingWizard', () => {
  it('starts at step 1 of 3', () => {
    render(<OnboardingWizard orgId="o1" initialName="Acme" />)
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Name your workspace/i)).toBeInTheDocument()
  })

  it('has a name input pre-filled', () => {
    render(<OnboardingWizard orgId="o1" initialName="Acme Inc" />)
    const input = screen.getByDisplayValue('Acme Inc') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })
})
