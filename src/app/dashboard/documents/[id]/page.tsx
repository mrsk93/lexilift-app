import { db } from '@/lib/db/client'
import { documents, documentChunks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  await requireAuth()

  const docs = await db.select().from(documents).where(eq(documents.id, id)).limit(1)
  const doc = docs[0]

  if (!doc) {
    notFound()
  }

  if (doc.orgId) {
    await requireOrgAccess(doc.orgId)
  }

  const chunks = await db.select()
    .from(documentChunks)
    .where(eq(documentChunks.docId, id))
    .orderBy(documentChunks.chunkIndex)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">{doc.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <span>{doc.fileType}</span>
            <span>&bull;</span>
            <span>{((doc.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</span>
            <span>&bull;</span>
            <Badge variant={doc.status === 'ready' ? 'default' : 'secondary'} className="capitalize">{doc.status}</Badge>
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <h2 className="text-lg font-semibold font-heading">Document Chunks ({doc.chunkCount})</h2>
        {chunks.length === 0 ? (
          <p className="text-muted-foreground bg-card p-6 rounded-md border border-border text-center">
            No chunks found. Ensure the document was processed successfully.
          </p>
        ) : (
          <div className="grid gap-4">
            {chunks.map(chunk => (
              <Card key={chunk.id} className="shadow-none border-border">
                <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                  <CardTitle className="text-sm font-mono flex items-center justify-between">
                    <span className="text-muted-foreground">Chunk #{chunk.chunkIndex}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4 px-4 text-sm whitespace-pre-wrap font-sans">
                  {chunk.content}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
