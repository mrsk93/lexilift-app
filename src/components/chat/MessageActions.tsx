import { RefreshCw, Pencil, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MessageActions({
  role,
  isStreaming,
  onRegenerate,
  onStop,
  onEdit,
}: {
  role: 'user' | 'assistant' | 'system'
  isStreaming: boolean
  onRegenerate: () => void
  onStop: () => void
  onEdit: () => void
}) {
  if (role === 'system') return null

  return (
    <div className="flex items-center gap-1">
      {isStreaming ? (
        <button
          type="button"
          aria-label="Stop"
          onClick={onStop}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Stop generating"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      ) : (
        <>
          {role === 'assistant' && (
            <button
              type="button"
              aria-label="Regenerate"
              onClick={onRegenerate}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {role === 'user' && (
            <button
              type="button"
              aria-label="Edit"
              onClick={onEdit}
              className={cn(
                'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
