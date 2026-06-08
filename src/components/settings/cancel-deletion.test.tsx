import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { CancelDeletionButton } from './CancelDeletionButton'

describe('CancelDeletionButton', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the cancel button initially', () => {
    render(<CancelDeletionButton />)
    expect(screen.getByRole('button', { name: /I changed my mind/i })).toBeInTheDocument()
  })

  it('POSTs to /api/account/cancel-deletion on click', async () => {
    render(<CancelDeletionButton />)
    fireEvent.click(screen.getByRole('button', { name: /I changed my mind/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/account/cancel-deletion',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('replaces the button with a confirmation message after success', async () => {
    render(<CancelDeletionButton />)
    fireEvent.click(screen.getByRole('button', { name: /I changed my mind/i }))

    await waitFor(() => {
      expect(screen.getByText(/Cancellation confirmed/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /I changed my mind/i })).toBeNull()
  })
})
