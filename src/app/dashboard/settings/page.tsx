import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentProfile, requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships, organizations, profiles } from '@/lib/db/schema'
import { OrgForm } from '@/components/settings/OrgForm'
import { DeleteOrgDialog } from '@/components/settings/DeleteOrgDialog'
import { TransferOwnershipDialog, type TransferCandidate } from '@/components/settings/TransferOwnershipDialog'

export default async function SettingsPage() {
  const profile = await getCurrentProfile()
  if (!profile?.currentOrgId) {
    redirect('/dashboard')
  }
  const orgId = profile.currentOrgId
  const { role, userId } = await requireOrgMember(orgId)

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) {
    return (
      <div className="p-8 text-muted-foreground">
        Organization not found.
      </div>
    )
  }

  const memberRows = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      fullName: profiles.fullName,
    })
    .from(memberships)
    .innerJoin(profiles, eq(memberships.userId, profiles.id))
    .where(eq(memberships.orgId, orgId))

  const members: TransferCandidate[] = memberRows.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.fullName,
  }))

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace.</p>
      </div>

      <Card className="shadow-none border-border">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Update your workspace name.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgForm orgId={orgId} initialName={org.name} />
        </CardContent>
      </Card>

      {role === 'owner' && (
        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle>Transfer ownership</CardTitle>
            <CardDescription>Make another member the owner. You will be downgraded to admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <TransferOwnershipDialog orgId={orgId} members={members} currentUserId={userId} />
          </CardContent>
        </Card>
      )}

      {role === 'owner' && (
        <Card className="shadow-none border-border border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger zone</CardTitle>
            <CardDescription>Permanently delete this workspace and all of its data.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteOrgDialog orgId={orgId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
