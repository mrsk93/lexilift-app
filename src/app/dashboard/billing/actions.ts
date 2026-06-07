'use server'

import { getBilling } from '@/lib/adapters/billing/polar'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { env } from '@/lib/env'
import type { PlanId } from '@/lib/billing/plans-data'

export async function createProCheckoutAction() {
  return createCheckoutAction('pro')
}

export async function createCheckoutAction(plan: PlanId) {
  const profile = await getCurrentProfile()
  if (!profile || !profile.currentOrgId) {
    throw new Error('No active organization found')
  }

  if (plan === 'enterprise') {
    return { url: env.POLAR_ENTERPRISE_CONTACT_URL || 'mailto:sales@lexilift.dev' }
  }

  const billing = getBilling()
  const productId =
    plan === 'pro' ? env.POLAR_PRO_PRODUCT_ID :
    plan === 'team' ? env.POLAR_TEAM_PRODUCT_ID :
    null

  if (!productId) {
    throw new Error(`No product ID configured for plan: ${plan}`)
  }

  const successUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`
  const url = await billing.createCheckout(profile.currentOrgId, productId, successUrl)
  return { url }
}
