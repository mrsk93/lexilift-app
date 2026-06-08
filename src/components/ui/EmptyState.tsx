import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  ctaHref?: string
  ctaLabel?: string
  icon?: React.ReactNode
}

export function EmptyState({ title, description, ctaHref, ctaLabel, icon }: EmptyStateProps) {
  return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3 bg-muted/20">
      <div className="flex justify-center">
        {icon ?? <Inbox className="w-10 h-10 text-muted-foreground" />}
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      )}
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className={buttonVariants({ variant: 'default', className: 'mt-2' })}>
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
