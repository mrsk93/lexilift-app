import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { logAuditEvent } from '@/lib/audit/log'

const putSchema = z.object({ name: z.string().min(1).max(60) })

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  onboardingCompletedAt: z.string().datetime().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { orgId } = await requireOrgAdmin(id)
    if (orgId !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const body = patchSchema.parse(await req.json())
    const update: { name?: string; onboardingCompletedAt?: Date; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (body.name !== undefined) update.name = body.name
    if (body.onboardingCompletedAt !== undefined) {
      update.onboardingCompletedAt = new Date(body.onboardingCompletedAt)
    }
    await db.update(organizations).set(update).where(eq(organizations.id, orgId))
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { orgId } = await requireOrgAdmin(id)
    if (orgId !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    const { name } = putSchema.parse(await req.json())
    await db.update(organizations).set({ name, updatedAt: new Date() }).where(eq(organizations.id, orgId))
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { orgId, userId, role } = await requireOrgAdmin(id)
    if (orgId !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    if (role !== 'owner') {
      return NextResponse.json({ error: 'OWNER_REQUIRED' }, { status: 403 })
    }
    await db.delete(organizations).where(eq(organizations.id, orgId))
    try {
      await logAuditEvent({
        orgId,
        actorId: userId,
        action: 'org.delete',
        targetType: 'organization',
        targetId: orgId,
      })
    } catch {
      // org is being deleted; audit row will be cascade-deleted anyway
    }
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    if (msg === 'Forbidden') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
