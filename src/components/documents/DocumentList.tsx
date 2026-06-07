'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from './StatusBadge'
import { DeleteDocButton } from './DeleteDocButton'
import { RestoreButton } from './RestoreButton'
import { ReprocessButton } from './ReprocessButton'
import { BulkActionsBar } from './BulkActionsBar'

export interface DocRow {
  id: string
  name: string
  status: string
  fileType: string | null
  fileSize: number | null
  createdAt: string | Date
}

export function DocumentList({
  initialDocs,
  trashed = false,
}: {
  initialDocs: DocRow[]
  trashed?: boolean
}) {
  const router = useRouter()
  const [docs, setDocs] = useState<DocRow[]>(initialDocs)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const isProcessing = (d: DocRow) => d.status !== 'ready' && d.status !== 'failed'
  const hasProcessing = !trashed && docs.some(isProcessing)
  const allSelected = docs.length > 0 && selected.size === docs.length

  useEffect(() => {
    if (!hasProcessing) return
    let cancelled = false
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/documents?status=processing')
        if (!r.ok) return
        const fresh: DocRow[] = await r.json()
        if (cancelled) return
        if (fresh.length === 0) {
          router.refresh()
          return
        }
        setDocs((prev) =>
          prev.map((p) => {
            const update = fresh.find((f) => f.id === p.id)
            return update ? { ...p, status: update.status } : p
          })
        )
      } catch {
        // network blip — keep polling
      }
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [hasProcessing, router])

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(docs.map((d) => d.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0 || bulkLoading) return
    setBulkLoading(true)
    try {
      const r = await fetch('/api/documents/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        toast.error(j.error ?? 'Bulk delete failed')
        return
      }
      const removed = Array.from(selected)
      setDocs((prev) => prev.filter((d) => !selected.has(d.id)))
      setSelected(new Set())
      toast.success(`${removed.length} document${removed.length === 1 ? '' : 's'} moved to trash`)
    } catch {
      toast.error('Network error')
    } finally {
      setBulkLoading(false)
    }
  }

  if (docs.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-card p-8 text-center text-muted-foreground text-sm">
        {trashed ? 'Trash is empty.' : 'No documents uploaded yet.'}
      </div>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {!trashed && (
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>{trashed ? 'Deleted' : 'Uploaded'}</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={d.id} data-state={selected.has(d.id) ? 'selected' : undefined}>
                {!trashed && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${d.name}`}
                      checked={selected.has(d.id)}
                      onChange={() => toggleOne(d.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{d.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.fileSize ? (d.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {trashed ? (
                      <RestoreButton
                        id={d.id}
                        onRestored={() => {
                          setDocs((prev) => prev.filter((x) => x.id !== d.id))
                        }}
                      />
                    ) : (
                      <>
                        {d.status === 'failed' && (
                          <ReprocessButton
                            id={d.id}
                            onReprocessed={() => {
                              setDocs((prev) =>
                                prev.map((x) => (x.id === d.id ? { ...x, status: 'processing' } : x))
                              )
                            }}
                          />
                        )}
                        <DeleteDocButton id={d.id} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!trashed && selected.size > 0 && (
        <BulkActionsBar
          count={selected.size}
          onDelete={handleBulkDelete}
          onClear={() => setSelected(new Set())}
        />
      )}
    </>
  )
}
