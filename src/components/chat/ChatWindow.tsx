'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageBubble } from './MessageBubble'
import { Button } from '@/components/ui/button'
import { ModelSelector } from './ModelSelector'
import { Send, Loader2 } from 'lucide-react'
import type { ModelId } from '@/lib/llm/models'
import { deriveTitle } from '@/lib/chat/auto-title'

export function ChatWindow({
  orgId,
  sessionId,
  model: initialModel = 'gpt-4o',
  title: initialTitle = 'New chat',
}: {
  orgId: string
  sessionId?: string
  model?: ModelId
  title?: string | null
}) {
  const router = useRouter()
  const [model, setModel] = useState<ModelId>(initialModel)
  const [title, setTitle] = useState<string>(initialTitle ?? 'New chat')
  const [input, setInput] = useState('')
  const titledOnce = useRef(false)

  // AI SDK v6: transport is the new way to configure endpoint + body.
  // Re-create when the model changes so the body sent to the server is fresh.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/query',
        body: { orgId, sessionId, modelName: model },
      }),
    [orgId, sessionId, model]
  )

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    transport,
  })

  const streaming: boolean =
    status === 'streaming' || status === 'submitted'

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (error) {
      toast.error(error.message ?? 'Chat error')
    }
  }, [error])

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    // Optimistically clear input so the user can keep typing
    setInput('')

    if (!sessionId || titledOnce.current || title !== 'New chat') {
      sendMessage({ text })
      return
    }
    const newTitle = deriveTitle(text)
    titledOnce.current = true
    sendMessage({ text })
    try {
      const r = await fetch(`/api/chat/sessions/${sessionId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (r.ok) setTitle(newTitle)
    } catch {
      // Non-fatal
    }
  }

  const onRegenerate = () => {
    if (typeof regenerate === 'function') {
      regenerate()
    } else {
      toast.error('Regenerate is unavailable')
    }
  }

  const onStop = () => {
    if (typeof stop === 'function') {
      stop()
    }
  }

  const onEdit = async (messageId: string | undefined, content: string) => {
    if (!messageId) return
    const next = window.prompt('Edit message:', content)
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed || trimmed === content) return
    try {
      const r = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        toast.error(j.error ?? 'Edit failed')
        return
      }
      toast.success('Message updated')
      router.refresh()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] border border-border rounded-lg bg-card overflow-hidden">
      <header className="border-b p-3 flex items-center justify-between gap-3 shrink-0">
        <h1 className="text-sm font-semibold truncate" title={title}>
          {title}
        </h1>
        {sessionId && (
          <ModelSelector sessionId={sessionId} value={model} onChange={setModel} />
        )}
      </header>
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            Ask me anything about your documents.
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id ?? i}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            message={m as any}
            isStreaming={streaming && i === messages.length - 1}
            onRegenerate={onRegenerate}
            onStop={onStop}
            onEdit={() => onEdit(m.id, '')}
          />
        ))}
        {streaming && (
          <div className="p-6 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-background border-t border-border">
        <form
          onSubmit={onFormSubmit}
          className="relative flex items-center max-w-4xl mx-auto"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-muted/50 border border-border rounded-full pl-6 pr-14 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={streaming}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 rounded-full h-10 w-10"
            disabled={streaming || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3">
          AI can make mistakes. Check important information from the sources.
        </p>
      </div>
    </div>
  )
}
