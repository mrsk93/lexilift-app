import { NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId

    await db
      .update(documents)
      .set({ deletedAt: null })
      .where(
        and(
          eq(documents.id, id),
          eq(documents.orgId, orgId),
          isNotNull(documents.deletedAt)
        )
      )

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
