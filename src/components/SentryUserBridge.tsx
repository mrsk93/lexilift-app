'use client'
import { useEffect } from 'react'
import { setClientUser } from '@/lib/sentry/client'

export function SentryUserBridge({ user }: { user: { id: string; email?: string | null } | null }) {
  useEffect(() => {
    if (user) setClientUser(user)
  }, [user])
  return null
}
