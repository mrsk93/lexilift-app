'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CreateOrgDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    const r = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setLoading(false)
    if (!r.ok) { toast.error('Create failed'); return }
    toast.success('Workspace created')
    setOpen(false)
    setName('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center w-full px-2 py-1.5 text-sm text-primary hover:bg-muted/50 rounded cursor-pointer">
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Workspace
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new workspace</DialogTitle>
          <DialogDescription>Each workspace has its own documents, members, and billing.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Acme Corp"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
