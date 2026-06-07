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

export interface PolarEvent {
  type: string
  data: {
    id: string
    status?: string
    customer_id?: string
    product_id?: string
    total_amount?: number
    currency?: string
    metadata?: { orgId?: string }
  }
}

export function parsePolarEvent(payload: string): PolarEvent {
  return JSON.parse(payload)
}
