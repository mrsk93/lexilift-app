'use client'
import { Trash2 } from 'lucide-react'

export function BulkActionsBar({
  count,
  onDelete,
  onClear,
}: {
  count: number
  onDelete: () => Promise<void>
  onClear: () => void
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white shadow-lg rounded-full px-4 py-2 flex gap-3 items-center border border-border">
      <span className="text-sm font-medium">{count} selected</span>
      <button
        type="button"
        onClick={onDelete}
        className="bg-red-600 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1 hover:bg-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Clear
      </button>
    </div>
  )
}
