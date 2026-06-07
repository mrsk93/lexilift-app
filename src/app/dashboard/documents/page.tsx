import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { and, eq, isNull, isNotNull, desc } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { UrlIngestForm } from '@/components/documents/UrlIngestForm'
import { DocumentsView } from '@/components/documents/DocumentsView'
import { type DocRow } from '@/components/documents/DocumentList'

export default async function DocumentsPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  const liveRows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt))

  const trashedRows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.orgId, orgId), isNotNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt))

  const toDocRow = (d: (typeof liveRows)[number]): DocRow => ({
    id: d.id,
    name: d.name,
    status: d.status ?? 'processing',
    fileType: d.fileType,
    fileSize: d.fileSize,
    createdAt: d.createdAt ?? new Date(),
  })

  const live = liveRows.map(toDocRow)
  const trashed = trashedRows.map(toDocRow)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Upload and manage files in your knowledge base.</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <UrlIngestForm />
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <UploadDropzone orgId={orgId} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold">Your Files</h3>
        <DocumentsView live={live} trashed={trashed} />
      </div>
    </div>
  )
}
