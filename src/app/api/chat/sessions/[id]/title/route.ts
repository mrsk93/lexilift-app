import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'

const schema = z
  .object({
    title: z.string().min(1).max(80).optional(),
    llmModel: z.string().min(1).max(60).optional(),
  })
  .refine((data) => data.title !== undefined || data.llmModel !== undefined, {
    message: 'At least one of title or llmModel must be provided',
  })

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const userId = profile.id

    const body = schema.parse(await req.json())

    const updates: { title?: string; llmModel?: string } = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.llmModel !== undefined) updates.llmModel = body.llmModel

    await db
      .update(chatSessions)
      .set(updates)
      .where(
        and(
          eq(chatSessions.id, id),
          eq(chatSessions.orgId, orgId),
          eq(chatSessions.userId, userId)
        )
      )

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
