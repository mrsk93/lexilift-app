'use client'

import { useChat } from 'ai/react'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send, MessageCircle, X, Loader2, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function WidgetContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isOpen, setIsOpen] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/widget/chat',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  if (!token) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {isOpen ? (
        <div className="w-[350px] h-[500px] bg-background border border-border rounded-xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center shadow-sm z-10">
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5" /> LexiLift Chat
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm mt-4">
                Hi! Ask me anything about our docs.
              </div>
            )}
            
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm
                  ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border border-border rounded-bl-none'}`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className={`prose prose-sm ${m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1 mr-2">
                  <Bot className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1 text-muted-foreground">
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-3 bg-background border-t border-border">
            <div className="relative flex items-center">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="w-full bg-muted border border-border rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost"
                className="absolute right-1 text-primary hover:text-primary hover:bg-transparent"
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={null}>
      <WidgetContent />
    </Suspense>
  )
}
