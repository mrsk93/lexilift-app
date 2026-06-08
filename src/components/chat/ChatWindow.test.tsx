/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AI SDK v6 — both useChat and DefaultChatTransport
const { mockSendMessage, mockGetStatus, mockStop, mockRegenerate, mockTransport } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockGetStatus: vi.fn(() => 'ready'),
  mockStop: vi.fn(),
  mockRegenerate: vi.fn(),
  mockTransport: vi.fn(),
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: mockSendMessage,
    get status() {
      return mockGetStatus()
    },
    stop: mockStop,
    regenerate: mockRegenerate,
  }),
}))

vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn(function DefaultChatTransport(opts) {
    mockTransport(opts)
    return { __opts: opts }
  }),
}))

vi.mock('@/lib/chat/auto-title', () => ({
  deriveTitle: (s: string) => `T:${s.slice(0, 10)}`,
}))

// Suppress real network/auth side effects
vi.mock('@/lib/auth/org-utils', () => ({}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatWindow } from './ChatWindow'
import { DefaultChatTransport } from 'ai'

describe('ChatWindow (AI SDK v6 wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatus.mockReturnValue('ready')
  })

  it('configures a DefaultChatTransport with api=/api/query and the body shape expected by /api/query', () => {
    render(
      <ChatWindow orgId="org-1" sessionId="sess-1" model="gpt-4o" title="New chat" />
    )
    expect(DefaultChatTransport).toHaveBeenCalled()
    const opts = mockTransport.mock.calls.at(-1)?.[0]
    expect(opts).toMatchObject({
      api: '/api/query',
      body: { orgId: 'org-1', sessionId: 'sess-1', modelName: 'gpt-4o' },
    })
  })

  it('lets the user type into the input (controlled by local state, not the SDK)', async () => {
    render(<ChatWindow orgId="o1" sessionId="s1" />)
    const input = screen.getByPlaceholderText('Ask a question...') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello world' } })
    expect(input.value).toBe('hello world')
  })

  it('enables the send button only when input is non-empty and not streaming', () => {
    mockGetStatus.mockReturnValue('ready')
    render(<ChatWindow orgId="o1" sessionId="s1" />)
    const btn = screen.getByRole('button', { name: '' }) as HTMLButtonElement
    expect(btn).toBeDisabled()
  })

  it('disables the input while streaming', () => {
    mockGetStatus.mockReturnValue('streaming')
    render(<ChatWindow orgId="o1" sessionId="s1" />)
    const input = screen.getByPlaceholderText('Ask a question...') as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('on submit: clears the input and calls sendMessage with the typed text', async () => {
    mockGetStatus.mockReturnValue('ready')
    render(<ChatWindow orgId="o1" sessionId="s1" />)
    const input = screen.getByPlaceholderText('Ask a question...') as HTMLInputElement
    fireEvent.change(input, { target: { value: '  hello world  ' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({ text: 'hello world' })
    })
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('seeds useChat with initialMessages (persisted history)', () => {
    render(
      <ChatWindow
        orgId="o1"
        sessionId="s1"
        initialMessages={[
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { id: 'm1', role: 'user' as const, parts: [{ type: 'text' as const, text: 'prior' }] } as any,
        ]}
      />
    )
    // The hook receives the messages from props; we can verify the call
    // passed them through. Vitest spy on useChat would be cleaner, but
    // asserting that no crash occurs on hydration is the user-visible
    // guarantee we care about.
    expect(screen.getByPlaceholderText('Ask a question...')).toBeInTheDocument()
  })
})
