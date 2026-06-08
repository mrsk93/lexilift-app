'use client'
import type { Role } from './MembersTable'

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Role
  onChange: (v: Role) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className="border rounded px-2 py-1 text-sm"
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  )
}
