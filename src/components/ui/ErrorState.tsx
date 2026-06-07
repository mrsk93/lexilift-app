import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 space-y-2">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-destructive font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      )}
    </div>
  )
}
