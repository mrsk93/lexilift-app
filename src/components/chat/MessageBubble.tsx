import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User } from 'lucide-react'
import { CitationCard } from './CitationCard'
import { FeedbackButtons } from './FeedbackButtons'

export function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user'
  const citations: Array<{
    index?: number
    docId?: string | null
    docName?: string | null
    excerpt?: string | null
    pageNum?: number | null
  }> = message.metadata?.citations || message.citations || []

  const messageId: string | undefined = message.id
  const feedback: 'thumbs_up' | 'thumbs_down' | null = message.feedback ?? null

  return (
    <div className={`flex gap-4 p-6 ${isUser ? 'bg-transparent' : 'bg-muted/30 border-y border-border'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground border border-border'}`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div className="flex-1 space-y-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {citations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Sources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {citations.map((c, i) => (
                <CitationCard
                  key={c.docId ?? i}
                  index={c.index ?? i + 1}
                  documentName={c.docName ?? 'Document'}
                  snippet={c.excerpt ?? ''}
                />
              ))}
            </div>
          </div>
        )}

        {!isUser && messageId && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            <FeedbackButtons messageId={messageId} initial={feedback} />
          </div>
        )}
      </div>
    </div>
  )
}
