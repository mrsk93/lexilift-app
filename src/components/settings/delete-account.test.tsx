import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DeleteAccountDialog } from './DeleteAccountDialog'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('DeleteAccountDialog', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, scheduledFor: '2026-07-08T00:00:00.000Z' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
    pushMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders a trigger button that is always enabled', () => {
    render(<DeleteAccountDialog />)
    expect(screen.getByRole('button', { name: /Delete my account/i })).not.toBeDisabled()
  })

  it('opens a modal with a confirm input on click', () => {
    render(<DeleteAccountDialog />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    expect(screen.getByPlaceholderText(/Type "DELETE"/i)).toBeInTheDocument()
  })

  it('keeps the destructive action button disabled until the user types DELETE exactly', () => {
    render(<DeleteAccountDialog />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    const input = screen.getByPlaceholderText(/Type "DELETE"/i)
    const confirmBtn = screen.getByRole('button', { name: /^Delete account$/i })

    expect(confirmBtn).toBeDisabled()
    fireEvent.change(input, { target: { value: 'del' } })
    expect(confirmBtn).toBeDisabled()
    fireEvent.change(input, { target: { value: 'DELETE' } })
    expect(confirmBtn).not.toBeDisabled()
  })

  it('POSTs to /api/account/delete and redirects to /goodbye on confirm', async () => {
    render(<DeleteAccountDialog />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    fireEvent.change(screen.getByPlaceholderText(/Type "DELETE"/i), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Delete account$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/account/delete',
        expect.objectContaining({ method: 'POST' })
      )
    })
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/goodbye')
    })
  })

  it('does not POST when the user clicks Cancel', () => {
    render(<DeleteAccountDialog />)
    fireEvent.click(screen.getByRole('button', { name: /Delete my account/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
