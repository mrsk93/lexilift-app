/**
 * @vitest-environment node
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.POSTHOG_PROJECT_API_KEY = 'phc_test_key'

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCapture, mockShutdown, MockPostHogCtor } = vi.hoisted(() => {
  const mockCapture = vi.fn()
  const mockShutdown = vi.fn()
  const MockPostHogCtor = vi.fn(function () {
    return { capture: mockCapture, shutdown: mockShutdown }
  })
  return { MockPostHogCtor, mockCapture, mockShutdown }
})

vi.mock('posthog-node', () => ({ PostHog: MockPostHogCtor }))

describe('trackServerEvent', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockShutdown.mockClear()
    MockPostHogCtor.mockClear()
    vi.resetModules()
  })

  it('calls PostHog capture with merged props', async () => {
    const { trackServerEvent } = await import('./posthog-server')
    await trackServerEvent({
      distinctId: 'u1',
      event: 'document.uploaded',
      properties: { orgId: 'o1' },
    })
    expect(MockPostHogCtor).toHaveBeenCalled()
    const instance =
      MockPostHogCtor.mock.results[MockPostHogCtor.mock.results.length - 1]
        ?.value
    expect(instance.capture).toHaveBeenCalledWith({
      distinctId: 'u1',
      event: 'document.uploaded',
      properties: expect.objectContaining({ orgId: 'o1' }),
    })
  })
})

describe('shutdownServerAnalytics', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockShutdown.mockClear()
    MockPostHogCtor.mockClear()
    vi.resetModules()
  })

  it('shuts down cached client and clears cache', async () => {
    const { trackServerEvent, shutdownServerAnalytics } = await import(
      './posthog-server'
    )
    await trackServerEvent({ distinctId: 'u1', event: 'test.event' })
    expect(MockPostHogCtor).toHaveBeenCalledTimes(1)
    await shutdownServerAnalytics()
    expect(mockShutdown).toHaveBeenCalled()
  })
})
