'use client'

import { Badge } from '@/components/ui/badge'

export function PlanBadge({ plan = 'starter' }: { plan?: string }) {
  const planColors: Record<string, string> = {
    starter: 'bg-muted text-muted-foreground',
    pro: 'bg-primary/20 text-primary',
    team: 'bg-secondary text-secondary-foreground',
    enterprise: 'bg-black text-white dark:bg-white dark:text-black',
  }

  return (
    <Badge variant="outline" className={`${planColors[plan.toLowerCase()] || planColors.starter} capitalize text-xs font-mono font-medium border-0`}>
      {plan}
    </Badge>
  )
}
