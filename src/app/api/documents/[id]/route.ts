import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { documents, documentChunks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getStorage } from '@/lib/adapters/storage/supabase'
import { getVectorStore } from '@/lib/adapters/vector-store/pinecone'
import { env } from '@/lib/env'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuth()

    const docs = await db.select().from(documents).where(eq(documents.id, id)).limit(1)
    const doc = docs[0]

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await requireOrgAccess(doc.orgId!)

    // 1. Delete from Supabase Storage
    const storage = getStorage()
    const extension = doc.fileType.split('/')[1] || 'pdf'
    const path = `${doc.orgId}/${id}.${extension}`
    
    try {
      await storage.deleteFile(path)
    } catch (e) {
      console.error('Storage delete error:', e)
    }

    // 2. Delete from Pinecone
    if (env.PINECONE_API_KEY) {
      const vectorStore = getVectorStore()
      const chunks = await db.select({ id: documentChunks.pineconeId }).from(documentChunks).where(eq(documentChunks.docId, id))
      const chunkIds = chunks.map(c => c.id).filter(Boolean) as string[]
      
      if (chunkIds.length > 0) {
        try {
          await vectorStore.delete(chunkIds, doc.orgId!)
        } catch (e) {
          console.error('Pinecone delete error:', e)
        }
      }
    }

    // 3. Delete from DB (documentChunks cascade automatically because of the foreign key `ON DELETE CASCADE` in schema)
    await db.delete(documents).where(eq(documents.id, id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
