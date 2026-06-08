import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'

export async function GET() {
  try {
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const userId = profile.id

    const rows = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId)))
      .orderBy(desc(chatSessions.createdAt))
      .limit(50)

    return NextResponse.json(rows)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const userId = profile.id

    const body = (await req.json().catch(() => ({}))) as { model?: string; source?: string }
    const model = body.model ?? 'gpt-4o'
    const source = body.source ?? 'dashboard'

    const [s] = await db
      .insert(chatSessions)
      .values({
        orgId,
        userId,
        source,
        llmModel: model,
        title: 'New chat',
      })
      .returning()

    return NextResponse.json(s, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
