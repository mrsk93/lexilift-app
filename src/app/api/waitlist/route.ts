import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { env } from '@/lib/env'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const resend = new Resend(env.RESEND_API_KEY || 'mock_key')

    if (env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'LexiLift <hello@lexilift.com>',
        to: email,
        subject: 'Welcome to the LexiLift Waitlist!',
        html: '<p>Hi there,</p><p>Thanks for joining the LexiLift waitlist. We will notify you as soon as we open up more spots!</p><p>Best,<br>The LexiLift Team</p>'
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist API Error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
