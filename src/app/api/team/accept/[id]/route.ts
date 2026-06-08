import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { invites, memberships } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/org-utils'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, id))
      .limit(1)

    if (!invite) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'ALREADY_ACCEPTED' }, { status: 409 })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })
    }

    await db.insert(memberships).values({
      orgId: invite.orgId,
      userId: user.id,
      role: invite.role,
    })

    await db
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, invite.id))

    return NextResponse.json({ orgId: invite.orgId }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
