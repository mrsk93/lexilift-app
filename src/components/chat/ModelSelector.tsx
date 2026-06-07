'use client'
import { MODELS, type ModelId } from '@/lib/llm/models'
import { useState } from 'react'
import { toast } from 'sonner'

export function ModelSelector({
  sessionId,
  value,
  onChange,
}: {
  sessionId: string
  value: ModelId
  onChange: (m: ModelId) => void
}) {
  const [saving, setSaving] = useState<ModelId | null>(null)

  return (
    <select
      value={saving ?? value}
      disabled={saving !== null}
      onChange={async (e) => {
        const next = e.target.value as ModelId
        setSaving(next)
        try {
          const r = await fetch(`/api/chat/sessions/${sessionId}/title`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ llmModel: next }),
          })
          if (!r.ok) {
            const j = await r.json().catch(() => ({}))
            toast.error(j.error ?? 'Failed to switch model')
            return
          }
          onChange(next)
        } catch {
          toast.error('Network error')
        } finally {
          setSaving(null)
        }
      }}
      className="border rounded px-2 py-1 text-sm bg-background"
      aria-label="Select model"
    >
      {MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  )
}
