import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentProfile, requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { memberships, organizations, profiles } from '@/lib/db/schema'
import { OrgForm } from '@/components/settings/OrgForm'
import { DeleteOrgDialog } from '@/components/settings/DeleteOrgDialog'
import { TransferOwnershipDialog, type TransferCandidate } from '@/components/settings/TransferOwnershipDialog'
import { MembersTable, type Member, type Role } from '@/components/team/MembersTable'
import { SettingsTabs } from '@/components/settings/SettingsTabs'
import { Shield, AlertTriangle } from 'lucide-react'

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
      <div className="p-8 text-muted-foreground">Organization not found.</div>
    )
  }

  const memberRows = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      fullName: profiles.fullName,
      role: memberships.role,
      createdAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(profiles, eq(memberships.userId, profiles.id))
    .where(eq(memberships.orgId, orgId))

  const members: Member[] = memberRows.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.fullName,
    role: (m.role as Role) ?? 'member',
    joinedAt: m.createdAt ?? new Date(),
  }))

  const transferCandidates: TransferCandidate[] = memberRows.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.fullName,
  }))

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace.</p>
      </div>

      <SettingsTabs
        defaultTab="general"
        tabs={[
          {
            id: 'general',
            label: 'General',
            content: (
              <Card className="shadow-none border-border">
                <CardHeader>
                  <CardTitle>Workspace</CardTitle>
                  <CardDescription>Update your workspace name.</CardDescription>
                </CardHeader>
                <CardContent>
                  <OrgForm orgId={orgId} initialName={org.name} />
                </CardContent>
              </Card>
            ),
          },
          {
            id: 'members',
            label: 'Members',
            content: (
              <Card className="shadow-none border-border">
                <CardHeader>
                  <CardTitle>Team members</CardTitle>
                  <CardDescription>Manage who has access to this workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MembersTable
                    members={members}
                    currentUserRole={role as Role}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: 'security',
            label: 'Security',
            content: (
              <Card className="shadow-none border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Security
                  </CardTitle>
                  <CardDescription>Manage your account security.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">Password</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Change your password from the password reset flow.
                    </p>
                    <a href="/forgot-password" className="text-sm text-primary hover:underline">
                      Reset password →
                    </a>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: 'danger',
            label: 'Danger',
            hidden: role !== 'owner',
            content: (
              <div className="space-y-6">
                <Card className="shadow-none border-border">
                  <CardHeader>
                    <CardTitle>Transfer ownership</CardTitle>
                    <CardDescription>Make another member the owner. You will be downgraded to admin.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TransferOwnershipDialog orgId={orgId} members={transferCandidates} currentUserId={userId} />
                  </CardContent>
                </Card>

                <Card className="shadow-none border-border border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Delete workspace
                    </CardTitle>
                    <CardDescription>Permanently delete this workspace and all its data. This cannot be undone.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DeleteOrgDialog orgId={orgId} />
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
