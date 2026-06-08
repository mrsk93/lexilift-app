import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsageGauge } from './UsageGauge'

describe('UsageGauge', () => {
  it('renders the used and limit values', () => {
    render(<UsageGauge used={50} limit={100} label="Queries" />)
    expect(screen.getByText(/Queries/)).toBeInTheDocument()
    expect(screen.getByText(/50/)).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('handles unlimited (Infinity) without crashing', () => {
    render(<UsageGauge used={42} limit={Infinity} label="Docs" />)
    expect(screen.getByText(/∞/)).toBeInTheDocument()
  })
})
