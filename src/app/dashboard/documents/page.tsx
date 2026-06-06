import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'
import { DeleteDocButton } from '@/components/documents/DeleteDocButton'

export default async function DocumentsPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.orgId, orgId))
    .orderBy(desc(documents.createdAt))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Upload and manage files in your knowledge base.</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <UploadDropzone orgId={orgId} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold">Your Files</h3>
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
              {docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No documents uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={d.status === 'ready' ? 'default' : d.status === 'processing' ? 'secondary' : 'destructive'}
                        className="capitalize"
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {((d.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.createdAt ? d.createdAt.toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <DeleteDocButton id={d.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
