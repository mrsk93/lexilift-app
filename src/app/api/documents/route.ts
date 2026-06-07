import { NextResponse } from 'next/server'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'

export async function GET(req: Request) {
  try {
    const profile = await getCurrentProfile()
    if (!profile?.currentOrgId) {
      return NextResponse.json({ error: 'NO_ORG' }, { status: 400 })
    }
    const orgId = profile.currentOrgId
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const where =
      status === 'processing'
        ? and(
            eq(documents.orgId, orgId),
            isNull(documents.deletedAt),
            ne(documents.status, 'ready'),
            ne(documents.status, 'failed')
          )
        : and(eq(documents.orgId, orgId), isNull(documents.deletedAt))

    const rows = await db
      .select({
        id: documents.id,
        name: documents.name,
        status: documents.status,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(where)
      .orderBy(documents.createdAt)

    return NextResponse.json(rows)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
