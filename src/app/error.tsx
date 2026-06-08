'use client'
import { useEffect } from 'react'
import { captureClientError } from '@/lib/sentry/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureClientError(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.digest ? `Reference: ${error.digest}` : 'An unexpected error occurred.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
