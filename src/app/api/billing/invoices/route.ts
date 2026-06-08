import { NextResponse } from 'next/server'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { db } from '@/lib/db/client'
import { invoices } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  await requireAuth()
  const orgId = await getCurrentOrgId()
  if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 })
  await requireOrgAccess(orgId)
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orgId, orgId))
    .orderBy(desc(invoices.createdAt))
  return NextResponse.json(rows)
}
