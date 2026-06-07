import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile, requireOrgMember } from '@/lib/auth/org-utils'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { assertOrgPlanLimit } from '@/lib/billing/assertOrgPlanLimit'

const schema = z.object({ url: z.string().url() })

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const { userId } = await requireOrgMember(orgId)
    try {
      await assertOrgPlanLimit(orgId, 'documents')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Document limit reached'
      return NextResponse.json({ error: message }, { status: 402 })
    }
    const { url } = schema.parse(await req.json())

    const [doc] = await db
      .insert(documents)
      .values({
        orgId,
        name: url,
        fileType: 'url',
        sourceUrl: url,
        status: 'processing',
        uploadedBy: userId,
      })
      .returning()

    await inngest.send({
      name: 'document/url.submitted',
      data: { documentId: doc.id, url },
    })

    return NextResponse.json({ id: doc.id, status: doc.status }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    if (msg === 'Forbidden') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
