import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { inngest } from '@/lib/inngest/client'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.orgId, orgId)))
      .limit(1)

    if (!doc) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    await db
      .update(documents)
      .set({ status: 'processing', errorMessage: null })
      .where(eq(documents.id, id))

    if (doc.fileType === 'url' && doc.sourceUrl) {
      await inngest.send({
        name: 'document/url.submitted',
        data: { documentId: doc.id, url: doc.sourceUrl },
      })
    } else {
      await inngest.send({
        name: 'document/uploaded',
        data: { docId: doc.id },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
