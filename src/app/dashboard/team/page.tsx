import { getCurrentProfile, requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MembersTable, type Member } from '@/components/team/MembersTable'
import { InviteForm } from '@/components/team/InviteForm'

export default async function TeamPage() {
  const profile = await getCurrentProfile()
  if (!profile?.currentOrgId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No active organization. Create or join one to manage a team.</p>
      </div>
    )
  }
  const orgId = profile.currentOrgId
  const { role } = await requireOrgMember(orgId)

  // TODO: fetch emails via supabase.auth.admin.getUserById(userId) and join to row once we
  // need to display them — profiles table intentionally has no email column.
  const rows = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      fullName: profiles.fullName,
      createdAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(profiles, eq(memberships.userId, profiles.id))
    .where(eq(memberships.orgId, orgId))

  const members: Member[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.fullName,
    role: r.role as Member['role'],
    joinedAt: r.createdAt ?? new Date(0),
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">Manage your organization members and invites.</p>
      </div>

      <Card className="shadow-none border-border">
        <CardHeader>
          <CardTitle>Invite a teammate</CardTitle>
          <CardDescription>They will receive an email with an acceptance link valid for 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {(role === 'owner' || role === 'admin') ? (
            <InviteForm />
          ) : (
            <p className="text-sm text-muted-foreground">Only admins can invite new members.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none border-border">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{members.length} member{members.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable members={members} currentUserRole={role as Member['role']} />
        </CardContent>
      </Card>
    </div>
  )
}
