'use client'
import { useState } from 'react'
import { DocumentList, type DocRow } from './DocumentList'
import { cn } from '@/lib/utils'

export function DocumentsView({
  live,
  trashed,
}: {
  live: DocRow[]
  trashed: DocRow[]
}) {
  const [tab, setTab] = useState<'live' | 'trash'>('live')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            tab === 'live'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Files ({live.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('trash')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            tab === 'trash'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Trash ({trashed.length})
        </button>
      </div>

      {tab === 'live' ? (
        <DocumentList initialDocs={live} />
      ) : (
        <DocumentList initialDocs={trashed} trashed />
      )}
    </div>
  )
}
