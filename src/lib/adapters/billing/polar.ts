import { Polar } from '@polar-sh/sdk'
import { env } from '@/lib/env'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export class PolarAdapter {
  private polar: Polar

  constructor() {
    this.polar = new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN || 'mock-token',
      server: env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    })
  }

  async createCheckout(orgId: string, productId: string, successUrl: string) {
    if (!env.POLAR_ACCESS_TOKEN) {
      return `${successUrl}?mock_checkout=true&plan=${productId}`
    }

    try {
      const checkout = await this.polar.checkouts.create({
        products: [productId],
        successUrl,
        metadata: {
          orgId
        }
      })
      return checkout.url
    } catch (error) {
      console.error('Failed to create Polar checkout', error)
      throw error
    }
  }

  async createPortalSession(orgId: string): Promise<string> {
    if (!env.POLAR_ACCESS_TOKEN) {
      return `https://polar.sh/mock-portal/${orgId}?mock=true`
    }

    const [org] = await db
      .select({ polarCustomerId: organizations.polarCustomerId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (!org?.polarCustomerId) {
      throw new Error('NO_CUSTOMER')
    }

    try {
      const session = await this.polar.customerSessions.create({
        customerId: org.polarCustomerId,
      })
      return session.customerPortalUrl
    } catch (error) {
      console.error('Failed to create Polar portal session', error)
      throw new Error('PORTAL_FAILED')
    }
  }

  get webhookSecret() {
    return env.POLAR_WEBHOOK_SECRET
  }
}

export function getBilling(): PolarAdapter {
  return new PolarAdapter()
}
