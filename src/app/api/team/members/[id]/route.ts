import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { logAuditEvent } from '@/lib/audit/log'

const patchSchema = z.object({ role: z.enum(['owner', 'admin', 'member']) })

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const { userId } = await requireOrgAdmin(orgId)
    const { id } = await params
    const body = patchSchema.parse(await req.json())
    await db
      .update(memberships)
      .set({ role: body.role })
      .where(and(eq(memberships.id, id), eq(memberships.orgId, orgId)))
    try {
      await logAuditEvent({
        orgId,
        actorId: userId,
        action: 'member.role_changed',
        targetType: 'org_member',
        targetId: id,
        metadata: { newRole: body.role },
      })
    } catch {
      // audit is best-effort; do not break the request
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const ctx = await requireOrgAdmin(orgId)
    const { id } = await params

    const target = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, id), eq(memberships.orgId, orgId)))
      .limit(1)
    const row = target[0]

    if (row?.role === 'owner') {
      const owners = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.orgId, orgId), eq(memberships.role, 'owner')))
      if (owners.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove last owner' }, { status: 400 })
      }
      if (row.userId === ctx.userId) {
        return NextResponse.json({ error: 'Transfer ownership before leaving' }, { status: 400 })
      }
    }

    await db.delete(memberships).where(and(eq(memberships.id, id), eq(memberships.orgId, orgId)))
    try {
      await logAuditEvent({
        orgId,
        actorId: ctx.userId,
        action: 'member.removed',
        targetType: 'org_member',
        targetId: id,
      })
    } catch {
      // audit is best-effort; do not break the request
    }
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
