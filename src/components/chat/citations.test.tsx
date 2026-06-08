import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitationCard } from './CitationCard'

describe('CitationCard', () => {
  it('renders the index marker, document name, and snippet', () => {
    render(
      <CitationCard
        index={1}
        documentName="Manual.pdf"
        snippet="The quick brown fox jumps over the lazy dog."
      />
    )
    expect(screen.getByText('[1]')).toBeInTheDocument()
    expect(screen.getByText('Manual.pdf')).toBeInTheDocument()
    expect(screen.getByText(/quick brown fox/)).toBeInTheDocument()
  })

  it('truncates very long snippets', () => {
    const long = 'a'.repeat(500)
    render(<CitationCard index={2} documentName="Big.pdf" snippet={long} />)
    const snippetEl = screen.getByText(/^a+\u2026?$/)
    expect(snippetEl.textContent?.length).toBeLessThanOrEqual(281)
  })

  it('uses fallback name when documentName is empty', () => {
    render(<CitationCard index={3} documentName="" snippet="content" />)
    expect(screen.getByText('Source')).toBeInTheDocument()
  })
})
