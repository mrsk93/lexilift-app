import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships } from '@/lib/db/schema'

const schema = z.object({ toUserId: z.string().uuid() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { orgId, userId, role } = await requireOrgMember(id)
    if (orgId !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    if (role !== 'owner') {
      return NextResponse.json({ error: 'OWNER_REQUIRED' }, { status: 403 })
    }
    const { toUserId } = schema.parse(await req.json())
    if (toUserId === userId) {
      return NextResponse.json({ error: 'SAME_USER' }, { status: 400 })
    }
    await db.transaction(async (tx) => {
      await tx
        .update(memberships)
        .set({ role: 'admin' })
        .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
      await tx
        .update(memberships)
        .set({ role: 'owner' })
        .where(and(eq(memberships.userId, toUserId), eq(memberships.orgId, orgId)))
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    if (msg === 'Forbidden') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
