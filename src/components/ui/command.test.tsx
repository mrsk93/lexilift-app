import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from './CommandPalette'

describe('CommandPalette', () => {
  it('opens on Cmd+K', () => {
    render(<CommandPalette items={[{ id: 'a', label: 'Documents', onSelect: () => {} }]} />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('opens on Ctrl+K', () => {
    render(<CommandPalette items={[{ id: 'a', label: 'Documents', onSelect: () => {} }]} />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<CommandPalette items={[{ id: 'a', label: 'Documents', onSelect: () => {} }]} />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
  })
})
