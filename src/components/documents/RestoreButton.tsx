'use client'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export function RestoreButton({
  id,
  onRestored,
}: {
  id: string
  onRestored: () => void
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const r = await fetch(`/api/documents/${id}/restore`, { method: 'POST' })
          if (!r.ok) {
            const j = await r.json().catch(() => ({}))
            toast.error(j.error ?? 'Restore failed')
            return
          }
          toast.success('Document restored')
          onRestored()
        } catch {
          toast.error('Network error')
        }
      }}
      className="text-emerald-600 hover:underline text-sm flex items-center gap-1"
      aria-label="Restore document"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Restore
    </button>
  )
}
