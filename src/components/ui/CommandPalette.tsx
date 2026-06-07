'use client'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

export interface CommandItem {
  id: string
  label: string
  onSelect: () => void
  group?: string
  icon?: React.ReactNode
  shortcut?: string
}

export function CommandPalette({ items }: { items: CommandItem[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  const groups: Record<string, CommandItem[]> = {}
  for (const item of items) {
    const g = item.group ?? 'Actions'
    if (!groups[g]) groups[g] = []
    groups[g].push(item)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 overflow-hidden [&>button]:hidden" showCloseButton={false}>
        <Command
          label="Global command menu"
          className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:px-4"
        >
          <Command.Input placeholder="Search…" className="w-full h-12 px-4 bg-transparent text-sm focus:outline-none" />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
            {Object.entries(groups).map(([groupName, groupItems]) => (
              <Command.Group
                key={groupName}
                heading={groupName}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {groupItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label}-${item.id}`}
                    onSelect={() => {
                      item.onSelect()
                      setOpen(false)
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && <kbd className="text-xs text-muted-foreground">{item.shortcut}</kbd>}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
