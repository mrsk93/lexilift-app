import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, MoreHorizontal, Trash } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DocumentsPage() {
  const orgId = "mock-org-id" // In a real app, get this from context or props

  // Mock data
  const documents = [
    { id: '1', name: 'LexiLift_Architecture.pdf', type: 'application/pdf', status: 'ready', size: 1048576, createdAt: new Date() },
    { id: '2', name: 'Employee_Handbook.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', status: 'processing', size: 524288, createdAt: new Date() },
    { id: '3', name: 'API_Documentation.md', type: 'text/markdown', status: 'failed', size: 20480, createdAt: new Date() },
  ]

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
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No documents uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={doc.status === 'ready' ? 'default' : doc.status === 'processing' ? 'secondary' : 'destructive'}
                        className="capitalize"
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
