import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsTabs } from './SettingsTabs'

describe('SettingsTabs', () => {
  it('renders the first tab by default', () => {
    render(
      <SettingsTabs
        tabs={[
          { id: 'a', label: 'Alpha', content: <div>Alpha content</div> },
          { id: 'b', label: 'Beta', content: <div>Beta content</div> },
        ]}
      />
    )
    expect(screen.getByText('Alpha content')).toBeInTheDocument()
    expect(screen.queryByText('Beta content')).not.toBeInTheDocument()
  })

  it('switches tabs on click', () => {
    render(
      <SettingsTabs
        tabs={[
          { id: 'a', label: 'Alpha', content: <div>Alpha content</div> },
          { id: 'b', label: 'Beta', content: <div>Beta content</div> },
        ]}
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(screen.getByText('Beta content')).toBeInTheDocument()
    expect(screen.queryByText('Alpha content')).not.toBeInTheDocument()
  })
})
