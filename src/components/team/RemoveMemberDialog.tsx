'use client'
import { useState } from 'react'

export function RemoveMemberDialog({
  memberName,
  onConfirm,
}: {
  memberName: string
  onConfirm: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:underline"
        aria-label={`Remove ${memberName}`}
      >
        Remove
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <p className="text-sm">
              Remove <strong>{memberName}</strong> from this organization?
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-3 py-1 text-sm border rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoading(true)
                  try {
                    await onConfirm()
                  } finally {
                    setLoading(false)
                    setOpen(false)
                  }
                }}
                disabled={loading}
                className="bg-red-600 text-white px-3 py-1 text-sm rounded"
              >
                {loading ? 'Removing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
