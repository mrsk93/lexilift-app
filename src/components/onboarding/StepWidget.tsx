'use client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export function StepWidget({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        <h2 className="text-2xl font-heading font-bold">You&apos;re all set!</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        When you&apos;re ready, you can create an embeddable chat widget from the
        Widgets page. Or dive right into the dashboard.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={onDone}>
          Open dashboard <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
