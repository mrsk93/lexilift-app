import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getStorage } from '@/lib/adapters/storage/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orgId = formData.get('orgId') as string

    if (!file || !orgId) {
      return NextResponse.json({ error: 'File and orgId are required' }, { status: 400 })
    }

    // Verify user has access to this org
    await requireOrgAccess(orgId)

    // 1. Upload to storage
    const storage = getStorage()
    const fileId = uuidv4()
    const extension = file.name.split('.').pop()
    const path = `${orgId}/${fileId}.${extension}`
    
    // In a real app we might want to check the file size and type first
    const fileUrl = await storage.uploadFile(path, file)

    // 2. Create DB record
    const [newDoc] = await db.insert(documents).values({
      id: fileId, // Use the same UUID for the DB record
      orgId,
      name: file.name,
      fileUrl,
      fileType: file.type || `application/${extension}`,
      fileSize: file.size,
      status: 'processing',
      uploadedBy: user.id
    }).returning()

    // 3. Trigger Ingestion Workflow (e.g. Vercel Workflows or Queue)
    // For now we just return the document
    // fetch('...trigger workflow...', { method: 'POST', body: JSON.stringify({ docId: newDoc.id }) })

    return NextResponse.json(newDoc)
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
