'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function NewChatButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true)
        try {
          const r = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          if (!r.ok) {
            toast.error('Failed to create chat')
            return
          }
          const s = await r.json()
          router.push(`/dashboard/chat/${s.id}`)
          router.refresh()
        } catch {
          toast.error('Network error')
        } finally {
          setLoading(false)
        }
      }}
      disabled={loading}
      className="bg-emerald-600 text-white text-sm px-3 py-2 rounded w-full flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      New chat
    </button>
  )
}
