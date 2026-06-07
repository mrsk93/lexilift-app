'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, MessageSquare, Settings, Users, CreditCard, LayoutDashboard, Code, Menu, LogOut } from 'lucide-react'
import { OrgSwitcher } from './OrgSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
  { name: 'Widget', href: '/dashboard/widget', icon: Code },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]

type SidebarOrg = {
  id: string
  name: string
  plan: string | null
}

function SidebarContent({
  organizations,
  currentOrgId,
  queryCount,
  queryLimit,
}: {
  organizations: SidebarOrg[]
  currentOrgId: string
  queryCount: number
  queryLimit: number
}) {
  const pathname = usePathname()
  const usagePercent = queryLimit > 0 ? Math.min((queryCount / queryLimit) * 100, 100) : 0

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 p-4 gap-6">
      <div className="flex items-center gap-2 px-2">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
          <FileText className="h-5 w-5" />
        </div>
        <span className="font-heading font-bold text-xl tracking-tight text-sidebar-foreground">LexiLift</span>
      </div>

      <div className="px-1">
        <OrgSwitcher organizations={organizations} currentOrgId={currentOrgId} />
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-2 flex flex-col gap-2">
        <div className="bg-card border border-border p-3 rounded-md shadow-sm">
          <p className="text-xs font-mono font-medium mb-1">Query Usage</p>
          <div className="w-full bg-muted rounded-full h-1.5 mb-2">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${usagePercent}%` }}></div>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
            {queryCount} / {queryLimit} Queries
          </p>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-sidebar-foreground/60 font-mono uppercase tracking-wider">Theme</span>
          <ThemeToggle />
        </div>

        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-red-500 w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  )
}

export function Sidebar({
  organizations,
  currentOrgId,
  queryCount = 0,
  queryLimit = 500,
}: {
  organizations: SidebarOrg[]
  currentOrgId: string
  queryCount?: number
  queryLimit?: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0">
        <SidebarContent
          organizations={organizations}
          currentOrgId={currentOrgId}
          queryCount={queryCount}
          queryLimit={queryLimit}
        />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1 rounded-sm">
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-heading font-bold text-lg">LexiLift</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SidebarContent
              organizations={organizations}
              currentOrgId={currentOrgId}
              queryCount={queryCount}
              queryLimit={queryLimit}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
