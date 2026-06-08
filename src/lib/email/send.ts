import { getResend } from './resend'
import { env } from '@/lib/env'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput): Promise<string | null> {
  const resend = getResend()
  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping email send')
    return null
  }
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  })
  if (error) throw new Error(error.message)
  return data?.id ?? null
}
