'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteAccountDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    if (confirm !== 'DELETE') return
    setBusy(true)
    try {
      await fetch('/api/account/delete', { method: 'POST' })
      setOpen(false)
      router.push('/goodbye')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-red-600 text-sm font-medium hover:underline"
      >
        Delete my account…
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-96 space-y-3 rounded bg-white p-6 shadow-lg">
            <h2 className="font-semibold">Delete account?</h2>
            <p className="text-sm text-gray-600">
              All your data will be permanently removed after a 30-day grace period. You can
              cancel anytime during that window.
            </p>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full rounded border px-2 py-1"
              data-testid="delete-confirm-input"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded px-3 py-1 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirm !== 'DELETE' || busy}
                onClick={handleConfirm}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
