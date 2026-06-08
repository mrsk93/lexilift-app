'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  onCreated: () => void
}

export function CreateTokenDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const r = await fetch('/api/widget/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!r.ok) throw new Error('Failed to create')
      toast.success('Widget created')
      setOpen(false)
      setName('')
      onCreated()
    } catch {
      toast.error('Could not create widget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="w-4 h-4" />
            New widget
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New widget token</DialogTitle>
          <DialogDescription>
            Give the widget a name so you can recognize it later (e.g. &ldquo;Marketing site&rdquo;).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="widget-name">Name</Label>
          <Input
            id="widget-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marketing site"
            autoFocus
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
