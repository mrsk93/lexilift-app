import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireAuth()

    const docs = await db.select().from(documents).where(eq(documents.id, id)).limit(1)
    const doc = docs[0]

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await requireOrgAccess(doc.orgId!)

    // Reset status to processing
    await db.update(documents)
      .set({ status: 'processing', errorMessage: null, chunkCount: 0 })
      .where(eq(documents.id, id))

    // Trigger Ingestion Workflow
    // fetch('...trigger workflow...', { method: 'POST', body: JSON.stringify({ docId: doc.id }) })

    return NextResponse.json({ success: true, status: 'processing' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
