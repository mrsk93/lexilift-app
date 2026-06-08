'use client'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type FeedbackValue = 'thumbs_up' | 'thumbs_down' | null

export function FeedbackButtons({
  messageId,
  initial,
}: {
  messageId: string
  initial: FeedbackValue
}) {
  const [val, setVal] = useState<FeedbackValue>(initial)
  const [, setPending] = useState<FeedbackValue>(null)

  const submit = async (v: 'thumbs_up' | 'thumbs_down') => {
    const next: FeedbackValue = val === v ? null : v
    setVal(next)
    setPending(next)
    try {
      const r = await fetch(`/api/chat/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: next }),
      })
      if (!r.ok) {
        setVal(val)
        toast.error('Failed to save feedback')
      }
    } catch {
      setVal(val)
      toast.error('Network error')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label="Thumbs up"
        aria-pressed={val === 'thumbs_up'}
        onClick={() => submit('thumbs_up')}
        className={cn(
          'p-1 rounded transition-colors',
          val === 'thumbs_up'
            ? 'text-emerald-600 bg-emerald-50'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Thumbs down"
        aria-pressed={val === 'thumbs_down'}
        onClick={() => submit('thumbs_down')}
        className={cn(
          'p-1 rounded transition-colors',
          val === 'thumbs_down'
            ? 'text-red-600 bg-red-50'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
