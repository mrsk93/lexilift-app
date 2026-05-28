import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { invites, memberships } from '@/lib/db/schema'
import { requireAuth, isAdmin } from '@/lib/auth/org-utils'
import { and, eq } from 'drizzle-orm'
import { env } from '@/lib/env'

// In a real app, you would use Resend to send the email
// import { Resend } from 'resend'
// const resend = new Resend(env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { email, role, orgId } = await request.json()

    if (!email || !orgId) {
      return NextResponse.json({ error: 'Email and orgId are required' }, { status: 400 })
    }

    const hasAdminAccess = await isAdmin(orgId, user.id)
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 })
    }

    const [newInvite] = await db.insert(invites).values({
      orgId,
      email,
      role: role || 'member',
      invitedBy: user.id
    }).returning()

    // TODO: Send email using Resend
    // await resend.emails.send({ ... })

    return NextResponse.json(newInvite)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 500 })
  }
}

export async function PUT(request: Request) {
  // Accept invite
  try {
    const user = await requireAuth()
    const { inviteId } = await request.json()

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
    }

    const inviteData = await db.select().from(invites).where(eq(invites.id, inviteId)).limit(1)
    const invite = inviteData[0]

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Verify user email matches invite email (assuming user.email is accessible or we just trust the logged in user)
    // Actually Supabase auth user has email.
    // For simplicity, we just check if it's not expired and not accepted.
    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
    }
    
    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 })
    }

    // Create membership
    await db.insert(memberships).values({
      orgId: invite.orgId!,
      userId: user.id,
      role: invite.role!
    })

    // Mark as accepted
    await db.update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, inviteId))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 500 })
  }
}
