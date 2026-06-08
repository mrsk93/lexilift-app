import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { db } from '@/lib/db/client'
import { widgetTokens } from '@/lib/db/schema'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId()
    if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })
    await requireOrgAdmin(orgId)

    const { id } = await params
    await db
      .delete(widgetTokens)
      .where(and(eq(widgetTokens.id, id), eq(widgetTokens.orgId, orgId)))

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 })
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
