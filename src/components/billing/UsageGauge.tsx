'use client'
import { Progress } from '@/components/ui/progress'

export function UsageGauge({
  used,
  limit,
  label,
}: {
  used: number
  limit: number
  label: string
}) {
  const isUnlimited = limit === Infinity
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const nearLimit = pct > 80
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground font-mono">
          {used.toLocaleString()} / {isUnlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${nearLimit ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
      />
    </div>
  )
}
