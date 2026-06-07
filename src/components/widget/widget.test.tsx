import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WidgetChat } from './WidgetChat'

vi.mock('next/navigation', () => ({}))

describe('WidgetChat', () => {
  it('renders an input and send button after opening', () => {
    render(<WidgetChat token="tok-abc" orgName="Acme" />)
    fireEvent.click(screen.getByLabelText(/open chat/i))
    expect(screen.getByLabelText(/your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('displays the org name', () => {
    render(<WidgetChat token="tok-abc" orgName="Acme Inc" />)
    expect(screen.getAllByText(/Acme Inc/).length).toBeGreaterThan(0)
  })
})
