import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { invites, profiles } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/send'
import { render } from '@react-email/render'
import { InviteEmail } from '@/lib/email/templates/invite'
import { env } from '@/lib/env'

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
})

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const orgId = url.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const { userId } = await requireOrgAdmin(orgId)
    const { email, role } = postSchema.parse(await req.json())

    const [invite] = await db
      .insert(invites)
      .values({ orgId, email, role, invitedBy: userId })
      .returning()

    const inviter = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    const inviterName = inviter[0]?.fullName ?? 'A teammate'
    const acceptUrl = `${env.APP_URL}/team/invite/${invite.id}`
    const html = await render(
      InviteEmail({
        orgName: 'your workspace',
        inviterName,
        acceptUrl,
      })
    )

    await sendEmail({
      to: email,
      subject: `${inviterName} invited you to LexiLift`,
      html,
    })

    return NextResponse.json({ id: invite.id }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
