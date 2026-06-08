import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { FeedbackButtons } from './FeedbackButtons'

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
})

describe('FeedbackButtons', () => {
  it('submits thumbs_up when up is clicked from null', async () => {
    render(<FeedbackButtons messageId="m1" initial={null} />)
    fireEvent.click(screen.getByLabelText('Thumbs up'))
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/chat/messages/m1/feedback',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feedback).toBe('thumbs_up')
  })

  it('toggles off when clicked again', () => {
    render(<FeedbackButtons messageId="m1" initial="thumbs_up" />)
    fireEvent.click(screen.getByLabelText('Thumbs up'))
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feedback).toBeNull()
  })

  it('submits thumbs_down when down is clicked', () => {
    render(<FeedbackButtons messageId="m1" initial={null} />)
    fireEvent.click(screen.getByLabelText('Thumbs down'))
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feedback).toBe('thumbs_down')
  })
})
