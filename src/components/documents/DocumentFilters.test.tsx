import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentFilters } from './DocumentFilters'

describe('DocumentFilters', () => {
  it('renders status and fileType selects', () => {
    render(
      <DocumentFilters
        value={{}}
        onChange={() => {}}
        availableFileTypes={['pdf', 'url']}
      />
    )
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/file type|fileType|source/i)).toBeInTheDocument()
  })

  it('calls onChange when status changes', () => {
    const onChange = vi.fn()
    render(
      <DocumentFilters value={{}} onChange={onChange} availableFileTypes={['pdf']} />
    )
    const statusSel = screen.getByLabelText(/status/i) as HTMLSelectElement
    fireEvent.change(statusSel, { target: { value: 'ready' } })
    expect(onChange).toHaveBeenCalledWith({ status: 'ready' })
  })

  it('renders file type options from prop', () => {
    render(
      <DocumentFilters
        value={{}}
        onChange={() => {}}
        availableFileTypes={['pdf', 'docx', 'url']}
      />
    )
    const sel = screen.getByLabelText(/file type|fileType|source/i) as HTMLSelectElement
    expect(sel.querySelectorAll('option').length).toBeGreaterThan(2)
  })
})
