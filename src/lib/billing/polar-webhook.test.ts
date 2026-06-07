import { describe, it, expect } from 'vitest'
import { verifyPolarSignature, parsePolarEvent } from './polar-webhook'

const secret = 'whsec_c3VwZXJfc2VjcmV0'

describe('verifyPolarSignature', () => {
  it('accepts a valid Standard Webhooks signature', async () => {
    const { Webhook } = await import('standardwebhooks')
    const wh = new Webhook(secret)
    const payload = JSON.stringify({ type: 'subscription.created', data: { id: 'sub_1' } })
    const signature = wh.sign('test-id', new Date(), payload)
    const headers = {
      'webhook-id': 'test-id',
      'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
      'webhook-signature': signature,
    }
    const ok = await verifyPolarSignature(payload, headers, secret)
    expect(ok).toBe(true)
  })

  it('rejects an invalid signature', async () => {
    const ok = await verifyPolarSignature('{}', { 'webhook-signature': 'v1,xxx' }, secret)
    expect(ok).toBe(false)
  })
})

describe('parsePolarEvent', () => {
  it('parses a payload', () => {
    const payload = JSON.stringify({ type: 'subscription.created', data: { id: 'sub_1' } })
    const e = parsePolarEvent(payload)
    expect(e.type).toBe('subscription.created')
  })
})
