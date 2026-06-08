import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

describe('UI state components', () => {
  it('Skeleton renders with custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeTruthy()
    expect(el.className).toMatch(/h-4/)
    expect(el.className).toMatch(/w-20/)
  })

  it('EmptyState renders title and CTA', () => {
    render(<EmptyState title="No docs" ctaHref="/x" ctaLabel="Upload" />)
    expect(screen.getByText('No docs')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Upload/i })
    expect(link).toHaveAttribute('href', '/x')
  })

  it('EmptyState renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('ErrorState renders message and optional retry', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Boom" onRetry={onRetry} />)
    expect(screen.getByText('Boom')).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: /Retry/i })
    btn.click()
    expect(onRetry).toHaveBeenCalled()
  })
})
