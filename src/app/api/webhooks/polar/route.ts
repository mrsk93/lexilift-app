import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { env } from '@/lib/env'
import { verifyPolarSignature, parsePolarEvent } from '@/lib/billing/polar-webhook'

const STATUS_PLAN: Record<string, 'starter' | 'pro' | 'team'> = {
  active: 'pro', trialing: 'pro',
  past_due: 'starter', canceled: 'starter', unpaid: 'starter',
}

export async function POST(req: Request) {
  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)

    if (!env.POLAR_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }
    const ok = await verifyPolarSignature(payload, headers, env.POLAR_WEBHOOK_SECRET)
    if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const event = parsePolarEvent(payload)
    if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
      const orgId = event.data.metadata?.orgId
      if (orgId) {
        const statusPlan = STATUS_PLAN[event.data.status] ?? 'starter'
        const isPro = env.POLAR_PRO_PRODUCT_ID === event.data.product_id
        const isTeam = env.POLAR_TEAM_PRODUCT_ID === event.data.product_id
        const newPlan = isPro ? 'pro' : isTeam ? 'team' : statusPlan
        await db.update(organizations).set({
          plan: newPlan,
          polarSubscriptionId: event.data.id,
          polarCustomerId: event.data.customer_id,
          queryLimit: newPlan === 'pro' ? 5000 : newPlan === 'team' ? 50000 : 500,
        }).where(eq(organizations.id, orgId))
      }
    } else if (event.type === 'subscription.canceled') {
      const orgId = event.data.metadata?.orgId
      if (orgId) {
        await db.update(organizations).set({ plan: 'starter', queryLimit: 500 }).where(eq(organizations.id, orgId))
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler failed'
    console.error('Polar webhook error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
