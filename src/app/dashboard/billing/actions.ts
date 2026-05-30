'use server'

import { getBilling } from '@/lib/adapters/billing/polar'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { env } from '@/lib/env'

export async function createProCheckoutAction() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.currentOrgId) {
    throw new Error('No active organization found')
  }

  const billing = getBilling()
  const productId = env.POLAR_PRO_PRODUCT_ID || 'pro_product_id'
  const successUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`

  const url = await billing.createCheckout(profile.currentOrgId, productId, successUrl)
  return { url }
}
