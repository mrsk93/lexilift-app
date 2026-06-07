import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'

export function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: number
  delta?: number
}) {
  const TrendIcon = delta === undefined || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown
  const trendColor =
    delta === undefined || delta === 0
      ? 'text-muted-foreground'
      : delta > 0
      ? 'text-emerald-600'
      : 'text-red-600'
  return (
    <Card className="shadow-none border-border">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold font-mono">{formatNumber(value)}</p>
        {delta !== undefined && (
          <p className={cn('text-xs mt-2 inline-flex items-center gap-1', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {delta >= 0 ? '+' : ''}
            {delta}% vs last week
          </p>
        )}
      </CardContent>
    </Card>
  )
}
