import { NextResponse } from 'next/server'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { getBilling } from '@/lib/adapters/billing/polar'

export async function POST() {
  await requireAuth()
  const orgId = await getCurrentOrgId()
  if (!orgId) {
    return NextResponse.json({ error: 'No active org' }, { status: 400 })
  }
  await requireOrgAccess(orgId)

  try {
    const url = await getBilling().createPortalSession(orgId)
    return NextResponse.json({ url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Portal failed'
    const status = msg === 'NO_CUSTOMER' ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
