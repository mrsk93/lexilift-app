'use client'
import { useEffect } from 'react'
import { captureClientError } from '@/lib/sentry/client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureClientError(error) }, [error])
  return (
    <html>
      <body>
        <div className="p-8 max-w-md mx-auto">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-4">{error.digest && `Reference: ${error.digest}`}</p>
          <button onClick={reset} className="bg-emerald-600 text-white px-3 py-1 rounded">Try again</button>
        </div>
      </body>
    </html>
  )
}
