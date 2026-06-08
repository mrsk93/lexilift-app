'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function DeleteOrgDialog({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-red-600 text-sm hover:underline"
      >
        Delete workspace…
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded shadow-lg w-96 max-w-full space-y-3">
            <h2 className="font-semibold text-lg">Delete this workspace?</h2>
            <p className="text-sm text-muted-foreground">
              This permanently deletes the organization, all documents, members, and chat history. This is
              irreversible.
            </p>
            <p className="text-xs">
              Type the workspace ID <code className="bg-muted px-1 rounded">{orgId}</code> to confirm:
            </p>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border rounded px-2 py-1 w-full text-sm font-mono"
              aria-label="Type workspace ID to confirm"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-3 py-1 text-sm border rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirm !== orgId || loading}
                onClick={async () => {
                  setLoading(true)
                  try {
                    const r = await fetch(`/api/organizations/${orgId}`, { method: 'DELETE' })
                    if (r.ok) {
                      toast.success('Workspace deleted')
                      router.push('/dashboard')
                    } else {
                      const j = await r.json().catch(() => ({}))
                      toast.error(j.error ?? 'Failed to delete')
                      setLoading(false)
                    }
                  } catch {
                    toast.error('Network error')
                    setLoading(false)
                  }
                }}
                className="bg-red-600 text-white px-3 py-1 text-sm rounded disabled:opacity-50"
              >
                {loading ? 'Deleting…' : 'Delete workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
