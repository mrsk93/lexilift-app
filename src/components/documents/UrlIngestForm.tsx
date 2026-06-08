'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function UrlIngestForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
          const r = await fetch('/api/ingest/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          })
          if (!r.ok) {
            const j = await r.json().catch(() => ({}))
            toast.error(j.error ?? 'Failed to add URL')
            return
          }
          toast.success('URL added — processing in the background')
          setUrl('')
          router.refresh()
        } catch {
          toast.error('Network error')
        } finally {
          setLoading(false)
        }
      }}
      className="flex gap-2 items-end"
    >
      <div className="flex flex-col gap-1 flex-1">
        <label htmlFor="url-input" className="text-xs text-muted-foreground">
          Add from URL
        </label>
        <input
          id="url-input"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.example.com/article"
          className="border rounded px-2 py-1 text-sm w-full bg-background"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground px-3 py-1 text-sm rounded h-[30px] disabled:opacity-50"
      >
        {loading ? 'Adding…' : 'Add URL'}
      </button>
    </form>
  )
}
