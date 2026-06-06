'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PlanBadge } from './PlanBadge'

type Organization = {
  id: string
  name: string
  plan: string | null
}

export function OrgSwitcher({ 
  organizations = [], 
  currentOrgId 
}: { 
  organizations: Organization[],
  currentOrgId?: string 
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  
  const currentOrg = organizations.find(org => org.id === currentOrgId) || organizations[0]

  async function switchOrg(orgId: string) {
    if (orgId === currentOrgId) return
    
    try {
      await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to switch org', error)
    }
  }

  if (!currentOrg) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-md transition-colors text-left outline-none">
        <Avatar className="h-8 w-8 rounded-md border border-border">
          <AvatarFallback className="rounded-md bg-primary/10 text-primary font-medium text-xs">
            {currentOrg.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden flex flex-col">
          <span className="text-sm font-medium truncate">{currentOrg.name}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <PlanBadge plan={currentOrg.plan ?? undefined} />
          </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground font-mono font-normal uppercase tracking-wider">
            Workspaces
          </DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem 
              key={org.id} 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => switchOrg(org.id)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{org.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{org.plan ?? 'starter'} Plan</span>
              </div>
              {org.id === currentOrgId && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          <span>Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
