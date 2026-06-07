'use client'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function ReprocessButton({
  id,
  onReprocessed,
}: {
  id: string
  onReprocessed?: () => void
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const r = await fetch(`/api/documents/${id}/reprocess`, { method: 'POST' })
          if (!r.ok) {
            const j = await r.json().catch(() => ({}))
            toast.error(j.error ?? 'Re-process failed')
            return
          }
          toast.success('Re-processing started')
          onReprocessed?.()
        } catch {
          toast.error('Network error')
        }
      }}
      className="text-amber-600 hover:underline text-sm flex items-center gap-1"
      aria-label="Re-process document"
    >
      <RefreshCw className="h-3.5 w-3.5" />
      Re-process
    </button>
  )
}
