import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    await requireOrgMember(orgId)

    const rows = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .leftJoin(profiles, eq(profiles.id, memberships.userId))
      .where(eq(memberships.orgId, orgId))

    const emails: Record<string, string | null> = {}
    try {
      const admin = createAdminClient()
      if (admin) {
        const userIds = rows.map((r) => r.userId)
        await Promise.all(
          userIds.map(async (uid) => {
            const { data } = await admin.auth.admin.getUserById(uid)
            emails[uid] = data.user?.email ?? null
          })
        )
      }
    } catch {
      // ignore — email is best-effort enrichment
    }

    return NextResponse.json(
      rows.map((r) => ({ ...r, email: emails[r.userId] ?? null }))
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}
