import { Resend } from 'resend'
import { env } from '@/lib/env'

let cached: Resend | null = null

export function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  if (cached) return cached
  cached = new Resend(env.RESEND_API_KEY)
  return cached
}
