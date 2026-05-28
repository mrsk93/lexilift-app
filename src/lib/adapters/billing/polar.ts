import { Polar } from '@polar-sh/sdk'
import { env } from '@/lib/env'

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
      const checkout = await this.polar.checkouts.custom.create({
        productId,
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

  get webhookSecret() {
    return env.POLAR_WEBHOOK_SECRET
  }
}

export function getBilling(): PolarAdapter {
  return new PolarAdapter()
}
