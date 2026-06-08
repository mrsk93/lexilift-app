'use client'
import { useState } from 'react'

export function CancelDeletionButton() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      await fetch('/api/account/cancel-deletion', { method: 'POST' })
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return <span className="text-sm text-emerald-600">Cancellation confirmed.</span>
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-sm text-emerald-600 underline disabled:opacity-50"
    >
      {busy ? 'Cancelling…' : 'I changed my mind — keep my account'}
    </button>
  )
}
