'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function StepOrg({
  initial,
  onNext,
}: {
  initial: string
  onNext: (name: string) => Promise<void> | void
}) {
  const [name, setName] = useState(initial)
  const [loading, setLoading] = useState(false)

  const handleNext = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await onNext(name.trim())
    } catch {
      toast.error('Could not save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Name your workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Give your team a name. You can change this later.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-name">Workspace name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc"
          autoFocus
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNext()
          }}
        />
      </div>
      <Button onClick={handleNext} disabled={!name.trim() || loading}>
        {loading ? 'Saving…' : 'Continue'}
      </Button>
    </div>
  )
}
