import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions } from '@/lib/db/schema'

const schema = z.object({
  feedback: z.enum(['thumbs_up', 'thumbs_down']).nullable(),
})

export async function POST(
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

    const { feedback } = schema.parse(await req.json())

    const [own] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .where(
        and(
          eq(chatMessages.id, id),
          eq(chatSessions.userId, userId),
          eq(chatSessions.orgId, orgId)
        )
      )
      .limit(1)

    if (!own) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    await db
      .update(chatMessages)
      .set({ feedback })
      .where(eq(chatMessages.id, id))

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
