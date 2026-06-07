import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, isAdmin } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'

export async function PUT(req: Request) {
  try {
    const user = await requireAuth()
    const orgId = await getCurrentOrgId()
    if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

    if (!(await isAdmin(orgId, user.id))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { llmModel } = await req.json()
    if (!['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'].includes(llmModel)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }

    await db.update(organizations).set({ llmModel }).where(eq(organizations.id, orgId))
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
