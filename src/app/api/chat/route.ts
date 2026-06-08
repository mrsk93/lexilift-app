import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    await requireOrgAccess(orgId)

    const sessions = await db.select()
      .from(chatSessions)
      .where(eq(chatSessions.orgId, orgId))
      .orderBy(desc(chatSessions.createdAt))

    return NextResponse.json(sessions)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { orgId, title } = body

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    }

    await requireOrgAccess(orgId)

    const [newSession] = await db.insert(chatSessions).values({
      orgId,
      userId: user.id,
      title: title || 'New Chat Session'
    }).returning()

    return NextResponse.json(newSession)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
