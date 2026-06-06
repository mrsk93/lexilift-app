import { Webhook } from 'standardwebhooks'

export async function verifyPolarSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string
): Promise<boolean> {
  try {
    const wh = new Webhook(secret)
    wh.verify(payload, headers)
    return true
  } catch {
    return false
  }
}

export interface PolarSubscriptionEvent {
  type: string
  data: {
    id: string
    customer_id: string
    product_id: string
    status: string
    metadata?: { orgId?: string }
  }
}

export function parsePolarEvent(payload: string): PolarSubscriptionEvent {
  return JSON.parse(payload)
}
