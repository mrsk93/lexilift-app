import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageActions } from './MessageActions'

describe('MessageActions', () => {
  it('fires onRegenerate for assistant messages', () => {
    const onRegenerate = vi.fn()
    render(
      <MessageActions
        role="assistant"
        isStreaming={false}
        onRegenerate={onRegenerate}
        onStop={() => {}}
        onEdit={() => {}}
      />
    )
    fireEvent.click(screen.getByLabelText('Regenerate'))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })

  it('fires onEdit for user messages', () => {
    const onEdit = vi.fn()
    render(
      <MessageActions
        role="user"
        isStreaming={false}
        onRegenerate={() => {}}
        onStop={() => {}}
        onEdit={onEdit}
      />
    )
    fireEvent.click(screen.getByLabelText('Edit'))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('fires onStop when stop button is clicked', () => {
    const onStop = vi.fn()
    render(
      <MessageActions
        role="assistant"
        isStreaming={true}
        onRegenerate={() => {}}
        onStop={onStop}
        onEdit={() => {}}
      />
    )
    fireEvent.click(screen.getByLabelText('Stop'))
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('does not render regenerate for user messages', () => {
    render(
      <MessageActions
        role="user"
        isStreaming={false}
        onRegenerate={() => {}}
        onStop={() => {}}
        onEdit={() => {}}
      />
    )
    expect(screen.queryByLabelText('Regenerate')).not.toBeInTheDocument()
  })
})
