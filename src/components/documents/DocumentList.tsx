'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { DeleteDocButton } from './DeleteDocButton'

export interface DocRow {
  id: string
  name: string
  status: string
  fileType: string | null
  fileSize: number | null
  createdAt: string | Date
}

export function DocumentList({ initialDocs }: { initialDocs: DocRow[] }) {
  const router = useRouter()
  const [docs, setDocs] = useState<DocRow[]>(initialDocs)

  const isProcessing = (d: DocRow) => d.status !== 'ready' && d.status !== 'failed'
  const hasProcessing = docs.some(isProcessing)

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

  if (docs.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-card p-8 text-center text-muted-foreground text-sm">
        No documents uploaded yet.
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((d) => (
            <TableRow key={d.id}>
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
              <TableCell>
                <DeleteDocButton id={d.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
