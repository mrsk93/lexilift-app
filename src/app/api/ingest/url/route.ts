import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentProfile, requireOrgMember } from '@/lib/auth/org-utils'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'

// TODO(plan2-t21): replace with real plan-limit assertion
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function assertPlanLimit(_orgId: string, _resource: 'documents' | 'queries' | 'widgets') {
  // No-op for now; enforced in Plan 2 Task 21
}

const schema = z.object({ url: z.string().url() })

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const { userId } = await requireOrgMember(orgId)
    await assertPlanLimit(orgId, 'documents')
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
