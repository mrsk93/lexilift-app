import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { organizations, memberships, profiles } from '@/lib/db/schema'
import { requireAuth, isOwner } from '@/lib/auth/org-utils'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    // Create Org
    const [newOrg] = await db.insert(organizations).values({
      name,
      slug,
      createdBy: user.id
    }).returning()

    // Add Owner Membership
    await db.insert(memberships).values({
      orgId: newOrg.id,
      userId: user.id,
      role: 'owner'
    })

    // Optionally set as current org
    await db.update(profiles)
      .set({ currentOrgId: newOrg.id })
      .where(eq(profiles.id, user.id))

    return NextResponse.json(newOrg)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 500 })
  }
}

export async function PUT(request: Request) {
  // Switch current organization
  try {
    const user = await requireAuth()
    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    await db.update(profiles)
      .set({ currentOrgId: orgId })
      .where(eq(profiles.id, user.id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 500 })
  }
}
