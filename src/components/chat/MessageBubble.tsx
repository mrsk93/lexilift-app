import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User } from 'lucide-react'

export function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user'
  const citations = message.metadata?.citations || []

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
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {citations.map((c: any, i: number) => (
                <div key={i} className="text-xs bg-muted border border-border rounded px-2 py-1 flex items-center gap-1">
                  <span className="font-medium text-primary">[{i + 1}]</span>
                  <span className="truncate max-w-[200px]">{c.metadata?.docId || 'Document'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
