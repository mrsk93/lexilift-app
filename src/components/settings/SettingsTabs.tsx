'use client'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SettingsTab {
  id: string
  label: string
  content: ReactNode
  hidden?: boolean
}

export function SettingsTabs({ tabs, defaultTab }: { tabs: SettingsTab[]; defaultTab?: string }) {
  const visibleTabs = tabs.filter((t) => !t.hidden)
  const [active, setActive] = useState(defaultTab ?? visibleTabs[0]?.id)
  const current = visibleTabs.find((t) => t.id === active)

  return (
    <div className="w-full">
      <div role="tablist" className="flex gap-1 border-b border-border mb-6">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
              active === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  )
}
