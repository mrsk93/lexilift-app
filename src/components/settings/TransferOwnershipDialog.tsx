'use client'
import { useState } from 'react'
import { toast } from 'sonner'

export interface TransferCandidate {
  id: string
  userId: string
  name: string | null
}

export function TransferOwnershipDialog({
  orgId,
  members,
  currentUserId,
}: {
  orgId: string
  members: TransferCandidate[]
  currentUserId: string
}) {
  const [target, setTarget] = useState('')
  const [loading, setLoading] = useState(false)
  const candidates = members.filter((m) => m.userId !== currentUserId)

  return (
    <div className="space-y-2 max-w-md">
      <p className="text-sm text-muted-foreground">
        Transfer ownership to another member. You will become an admin.
      </p>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-full"
        aria-label="Select new owner"
      >
        <option value="">Select a member…</option>
        {candidates.map((m) => (
          <option key={m.id} value={m.userId}>
            {m.name ?? m.userId}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!target || loading}
        onClick={async () => {
          setLoading(true)
          try {
            const r = await fetch(`/api/organizations/${orgId}/transfer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ toUserId: target }),
            })
            if (r.ok) {
              toast.success('Ownership transferred')
              window.location.reload()
            } else {
              const j = await r.json().catch(() => ({}))
              toast.error(j.error ?? 'Transfer failed')
              setLoading(false)
            }
          } catch {
            toast.error('Network error')
            setLoading(false)
          }
        }}
        className="bg-amber-600 text-white px-3 py-1 text-sm rounded disabled:opacity-50"
      >
        {loading ? 'Transferring…' : 'Transfer ownership'}
      </button>
    </div>
  )
}
