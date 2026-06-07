'use client'
import { useState } from 'react'
import { RoleSelect } from './RoleSelect'
import { RemoveMemberDialog } from './RemoveMemberDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Users } from 'lucide-react'

export type Role = 'owner' | 'admin' | 'member'

export interface Member {
  id: string
  userId: string
  name: string | null
  role: Role
  joinedAt: Date
}

export function MembersTable({
  members,
  currentUserRole,
}: {
  members: Member[]
  currentUserRole: Role
}) {
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin'
  const [rows, setRows] = useState(members)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No teammates yet"
        description="Invite your first teammate to start collaborating."
        icon={<Users className="w-10 h-10 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Name</th>
            <th className="text-left px-4 py-2 font-medium">Role</th>
            <th className="text-left px-4 py-2 font-medium">Joined</th>
            {canEdit && <th className="text-right px-4 py-2 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-4 py-2">{m.name ?? '—'}</td>
              <td className="px-4 py-2">
                {canEdit && m.role !== 'owner' ? (
                  <RoleSelect
                    value={m.role}
                    onChange={async (role) => {
                      const r = await fetch(`/api/team/members/${m.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role }),
                      })
                      if (r.ok) {
                        setRows((prev) => prev.map((row) => (row.id === m.id ? { ...row, role } : row)))
                      }
                    }}
                  />
                ) : (
                  <span className="capitalize">{m.role}</span>
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(m.joinedAt).toLocaleDateString()}
              </td>
              {canEdit && (
                <td className="px-4 py-2 text-right">
                  {m.role !== 'owner' && (
                    <RemoveMemberDialog
                      memberName={m.name ?? 'this member'}
                      onConfirm={async () => {
                        const r = await fetch(`/api/team/members/${m.id}`, {
                          method: 'DELETE',
                        })
                        if (r.ok) {
                          setRows((prev) => prev.filter((row) => row.id !== m.id))
                        }
                      }}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
