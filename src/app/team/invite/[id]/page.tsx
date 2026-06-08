'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Status = 'pending' | 'ok' | 'error'

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [status, setStatus] = useState<Status>('pending')

  useEffect(() => {
    if (!params?.id) return
    fetch(`/api/team/accept/${params.id}`, { method: 'POST' })
      .then((r) => {
        if (r.ok) {
          setStatus('ok')
          router.push('/dashboard')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [params?.id, router])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-none border-border text-center">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>
              The invite may have expired or already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-muted-foreground">
      Accepting invitation…
    </div>
  )
}
