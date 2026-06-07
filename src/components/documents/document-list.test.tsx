import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

const mockRouterRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { DocumentList, type DocRow } from './DocumentList'

const baseDoc: DocRow = {
  id: 'd1',
  name: 'doc.pdf',
  status: 'processing',
  fileType: 'application/pdf',
  fileSize: 1024,
  createdAt: new Date('2026-06-07T10:00:00Z'),
}

describe('DocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial docs', () => {
    render(<DocumentList initialDocs={[baseDoc]} />)
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
  })

  it('shows empty state when no docs', () => {
    render(<DocumentList initialDocs={[]} />)
    expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument()
  })

  it('does not poll when all docs are ready', async () => {
    vi.useFakeTimers()
    const readyDoc: DocRow = { ...baseDoc, status: 'ready' }
    render(<DocumentList initialDocs={[readyDoc]} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(mockFetch).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('polls when some docs are processing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<DocumentList initialDocs={[baseDoc]} />)

    await waitFor(
      () => expect(mockFetch).toHaveBeenCalledWith('/api/documents?status=processing'),
      { timeout: 4000, interval: 50 }
    )
  })

  it('updates status from polling response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 'd1', status: 'ready' }]),
    })

    render(<DocumentList initialDocs={[baseDoc]} />)

    await waitFor(
      () => expect(screen.getAllByText('ready').length).toBeGreaterThan(0),
      { timeout: 4000, interval: 50 }
    )
  })

  it('calls router.refresh when no processing docs remain', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<DocumentList initialDocs={[baseDoc]} />)

    await waitFor(() => expect(mockRouterRefresh).toHaveBeenCalled(), {
      timeout: 4000,
      interval: 50,
    })
  })
})
