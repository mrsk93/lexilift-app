import { NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { invites } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    await requireOrgAdmin(orgId)
    const { id } = await params
    await db
      .delete(invites)
      .where(and(eq(invites.id, id), eq(invites.orgId, orgId)))
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
