'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'

export function ChatWindow({ orgId, sessionId }: { orgId: string, sessionId?: string }) {
  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/query',
    body: {
      orgId,
      sessionId
    },
    initialMessages: [
      { id: '1', role: 'assistant', content: 'Hello! Ask me anything about your documents.' }
    ]
  })
  
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && (
          <div className="p-6 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-background border-t border-border">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center max-w-4xl mx-auto"
        >
          <input
            value={input || ''}
            onChange={(e) => {
              if (handleInputChange) {
                handleInputChange(e);
              } else if (setInput) {
                setInput(e.target.value);
              }
            }}
            placeholder="Ask a question..."
            className="w-full bg-muted/50 border border-border rounded-full pl-6 pr-14 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-2 rounded-full h-10 w-10"
            disabled={isLoading || !input?.trim()}
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
