import { Badge } from '@/components/ui/badge'

const VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  processing: 'secondary',
  ready: 'default',
  failed: 'destructive',
}

export function StatusBadge({ status }: { status: string }) {
  const variant = VARIANT[status] ?? 'outline'
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}
