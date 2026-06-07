'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const email = params.get('email')
  const [state, setState] = useState<'verifying' | 'success' | 'error'>(() =>
    token && email ? 'verifying' : 'error'
  )

  useEffect(() => {
    if (state !== 'verifying' || !token || !email) return
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
      .then((r) => {
        if (r.ok) {
          setState('success')
          setTimeout(() => router.push('/dashboard'), 1500)
        } else {
          setState('error')
        }
      })
      .catch(() => setState('error'))
  }, [token, email, router, state])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-sm shadow-none border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === 'verifying' && <Loader2 className="w-5 h-5 animate-spin" />}
            {state === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {state === 'error' && <XCircle className="w-5 h-5 text-destructive" />}
            {state === 'verifying' && 'Verifying…'}
            {state === 'success' && 'Email verified'}
            {state === 'error' && 'Verification failed'}
          </CardTitle>
          <CardDescription>
            {state === 'verifying' && 'Hang tight, we&apos;re confirming your email.'}
            {state === 'success' && 'Redirecting you to the dashboard…'}
            {state === 'error' && 'The link may be expired. Try signing in to get a new one.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state === 'error' && (
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-primary hover:underline"
            >
              Back to sign in
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
