'use client'
import { useState } from 'react'
import { toast } from 'sonner'

type Role = 'admin' | 'member'

export function InviteForm({ onInvited }: { onInvited?: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setLoading(true)
        setErr(null)
        try {
          const r = await fetch('/api/team/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role }),
          })
          if (!r.ok) {
            const j = await r.json().catch(() => ({}))
            setErr(j.error ?? 'Failed to send invite')
            return
          }
          setEmail('')
          toast.success(`Invite sent to ${email}`)
          onInvited?.()
        } catch {
          setErr('Network error')
        } finally {
          setLoading(false)
        }
      }}
      className="flex gap-2 items-end flex-wrap"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="text-xs text-muted-foreground">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="border rounded px-2 py-1 text-sm w-64"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-role" className="text-xs text-muted-foreground">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-emerald-600 text-white px-3 py-1 text-sm rounded h-[30px]"
      >
        {loading ? 'Sending…' : 'Send invite'}
      </button>
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </form>
  )
}
