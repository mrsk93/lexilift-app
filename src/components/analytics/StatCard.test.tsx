import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders label and formatted value', () => {
    render(<StatCard label="Queries" value={1234} />)
    expect(screen.getByText('Queries')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })
  it('shows delta with + sign when positive', () => {
    render(<StatCard label="Docs" value={42} delta={5} />)
    expect(screen.getByText('+5% vs last week')).toBeInTheDocument()
  })
  it('shows delta with - sign when negative', () => {
    render(<StatCard label="Docs" value={42} delta={-3} />)
    expect(screen.getByText('-3% vs last week')).toBeInTheDocument()
  })
})
