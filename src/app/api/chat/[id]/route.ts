import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuth()

    const sessions = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1)
    const session = sessions[0]

    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await requireOrgAccess(session.orgId!)

    await db.delete(chatSessions).where(eq(chatSessions.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
