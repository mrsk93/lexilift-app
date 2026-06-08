import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { Toaster } from './Toaster'
import { notify } from '@/lib/ui/toast'

describe('Toaster', () => {
  it('renders sonner toaster', () => {
    render(<Toaster />)
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })
})

describe('notify helper', () => {
  beforeEach(() => vi.clearAllMocks())

  it('success delegates to sonner toast.success', () => {
    notify.success('hello')
    expect(toast.success).toHaveBeenCalledWith('hello')
  })

  it('error delegates to sonner toast.error', () => {
    notify.error('oops')
    expect(toast.error).toHaveBeenCalledWith('oops')
  })
})
