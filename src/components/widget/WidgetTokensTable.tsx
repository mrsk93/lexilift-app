'use client'

import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

export interface WidgetToken {
  id: string
  name: string
  token: string
  createdAt: string | Date | null
}

interface Props {
  tokens: WidgetToken[]
  appUrl: string
  onDeleted?: () => void
}

export function WidgetTokensTable({ tokens, appUrl, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const snippet = (token: string) =>
    `<script src="${appUrl}/widget/${token}/embed" async></script>`

  const copy = (token: string) => {
    navigator.clipboard.writeText(snippet(token))
    toast.success('Embed snippet copied')
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this widget token? Sites using it will stop working.')) return
    setDeletingId(id)
    try {
      const r = await fetch(`/api/widget/tokens/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('failed')
      toast.success('Widget deleted')
      onDeleted?.()
    } catch {
      toast.error('Could not delete widget')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Name</th>
            <th className="text-left px-4 py-2 font-medium">Embed snippet</th>
            <th className="text-left px-4 py-2 font-medium">Created</th>
            <th className="text-left px-4 py-2 font-medium">Last used</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted-foreground py-8">
                No widgets yet. Create one to get started.
              </td>
            </tr>
          )}
          {tokens.map((t) => (
            <tr key={t.id} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{t.name}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate max-w-md">
                    {snippet(t.token)}
                  </code>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => copy(t.token)}
                    aria-label="Copy embed snippet"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </td>
              <td className="px-4 py-2 text-muted-foreground text-xs">
                {formatDate(t.createdAt)}
              </td>
              <td className="px-4 py-2 text-muted-foreground text-xs">Never</td>
              <td className="px-2 py-2">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => remove(t.id)}
                  disabled={deletingId === t.id}
                  aria-label="Delete widget"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
