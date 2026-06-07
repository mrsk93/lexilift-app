'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Bot, User as UserIcon, X, MessageCircle, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Msg {
  id?: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ index: number; docName?: string; excerpt?: string }>
}

export function WidgetChat({
  token,
  orgName,
  primaryColor,
  welcomeMessage,
}: {
  token: string
  orgName: string
  primaryColor?: string
  welcomeMessage?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [msgs, isOpen])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Msg = { role: 'user', content: text }
    const history = [...msgs, userMsg]
    setMsgs(history)
    setInput('')
    setLoading(true)
    try {
      const r = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      })
      if (!r.ok || !r.body) {
        setMsgs((m) => [
          ...m,
          { role: 'assistant', content: 'Sorry, I had trouble answering. Please try again.' },
        ])
        return
      }
      const citationsHeader = r.headers.get('x-citations')
      let parsedCitations: Msg['citations'] = []
      if (citationsHeader) {
        try {
          const docIds: string[] = JSON.parse(citationsHeader)
          parsedCitations = docIds
            .filter((id): id is string => Boolean(id))
            .map((docId, i) => ({ index: i + 1, docName: `Source ${i + 1}`, excerpt: docId }))
        } catch {
          parsedCitations = []
        }
      }
      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      // Insert placeholder assistant message to stream into
      setMsgs((m) => [...m, { role: 'assistant', content: '', citations: parsedCitations }])
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMsgs((m) => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: acc }
          }
          return copy
        })
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: 'Network error. Please check your connection and retry.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans">
        <span className="text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded-md shadow-sm border border-border">
          {orgName}
        </span>
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[95vw] h-[500px] bg-background border border-border rounded-xl shadow-xl flex flex-col overflow-hidden font-sans">
      <div
        className="p-4 text-primary-foreground flex justify-between items-center shadow-sm"
        style={primaryColor ? { backgroundColor: primaryColor } : undefined}
      >
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Bot className="w-5 h-5" />
          Ask {orgName}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
        {msgs.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8 px-4">
            {welcomeMessage ?? `Hi! Ask me anything about ${orgName}'s docs.`}
          </div>
        )}

        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role !== 'user' && (
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-card border border-border rounded-bl-none'
              }`}
            >
              <div
                className={`prose prose-sm ${m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
              {m.citations && m.citations.length > 0 && m.content && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                  {m.citations.slice(0, 3).map((c, ci) => (
                    <div key={ci} className="text-xs text-muted-foreground">
                      <span className="font-medium">[{c.index}]</span> {c.docName ?? 'Source'}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <UserIcon className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1 mr-2">
              <Bot className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-none px-3 py-2 flex items-center gap-1 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="p-3 bg-background border-t border-border"
      >
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-muted border border-border rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
            aria-label="Your message"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute right-1 text-primary hover:bg-transparent"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
