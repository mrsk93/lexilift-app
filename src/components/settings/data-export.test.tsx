import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DataExportButton } from './DataExportButton'

describe('DataExportButton', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: () => void
  let anchorDownload: string | undefined
  let anchorHref: string | undefined

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: { id: 'u1' },
          memberships: [],
          organizations: [],
          documents: [],
          chatSessions: [],
          chatMessages: [],
          widgetTokens: [],
          invoices: [],
          exportedAt: '2026-06-08T00:00:00.000Z',
        }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    createObjectURL = vi.fn().mockReturnValue('blob:test-url')
    revokeObjectURL = vi.fn()
    clickSpy = vi.fn()

    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL

    const origCreate: typeof document.createElement = document.createElement.bind(document)
    ;(document as unknown as { createElement: typeof document.createElement }).createElement = ((
      tag: string
    ) => {
      const el = origCreate(tag) as HTMLAnchorElement
      if (tag === 'a') {
        el.click = (() => {
          anchorDownload = el.download
          anchorHref = el.href
          clickSpy()
        }) as unknown as typeof el.click
      }
      return el as unknown as HTMLElement
    }) as unknown as typeof document.createElement
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    anchorDownload = undefined
    anchorHref = undefined
  })

  it('POSTs to /api/account/export when clicked', async () => {
    render(<DataExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /Download my data/i }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/account/export',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('triggers a download with a date-stamped JSON filename', async () => {
    render(<DataExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /Download my data/i }))

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json')
    expect(anchorDownload).toMatch(/^lexilift-export-\d{4}-\d{2}-\d{2}\.json$/)
    expect(anchorHref).toBe('blob:test-url')
  })

  it('shows busy state during download and resets after', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    )

    render(<DataExportButton />)
    fireEvent.click(screen.getByRole('button', { name: /Download my data/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Preparing/i })).toBeDisabled()
    })

    resolveFetch?.({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Download my data/i })
      ).not.toBeNull()
      expect(
        screen.getByRole('button', { name: /Download my data/i })
      ).not.toBeDisabled()
    })
  })
})
