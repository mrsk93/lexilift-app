import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TermsPage from '@/app/(legal)/terms/page'
import PrivacyPage from '@/app/(legal)/privacy/page'
import DpaPage from '@/app/(legal)/dpa/page'

describe('Legal pages', () => {
  it('Terms page renders', () => {
    render(<TermsPage />)
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument()
  })

  it('Privacy page renders', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument()
  })

  it('DPA page renders', () => {
    render(<DpaPage />)
    expect(screen.getByRole('heading', { name: /Data Processing Addendum/i })).toBeInTheDocument()
  })
})
