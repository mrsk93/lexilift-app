import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const { ids } = schema.parse(await req.json())

    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(
        and(
          inArray(documents.id, ids),
          eq(documents.orgId, orgId),
          isNull(documents.deletedAt)
        )
      )

    return NextResponse.json({ deleted: ids.length })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
