'use client'
import { useState } from 'react'
import { toast } from 'sonner'

export function OrgForm({ orgId, initialName }: { orgId: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
          const r = await fetch(`/api/organizations/${orgId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          })
          if (!r.ok) {
            const j = await r.json().catch(() => ({}))
            toast.error(j.error ?? 'Failed to save')
            return
          }
          toast.success('Workspace updated')
        } finally {
          setLoading(false)
        }
      }}
      className="space-y-2 max-w-md"
    >
      <label htmlFor="org-name" className="block text-sm font-medium">
        Workspace name
      </label>
      <input
        id="org-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-2 py-1 w-full text-sm"
        maxLength={60}
      />
      <button
        type="submit"
        disabled={loading || name === initialName}
        className="bg-emerald-600 text-white px-3 py-1 text-sm rounded disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
