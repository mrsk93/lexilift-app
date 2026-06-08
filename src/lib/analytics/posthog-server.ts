import { PostHog } from 'posthog-node'
import { env } from '@/lib/env'

let cached: PostHog | null = null

function get(): PostHog | null {
  if (!env.POSTHOG_PROJECT_API_KEY) return null
  if (cached) return cached
  cached = new PostHog(env.POSTHOG_PROJECT_API_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
  })
  return cached
}

export async function trackServerEvent(input: {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
}) {
  const client = get()
  if (!client) return
  client.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: input.properties ?? {},
  })
}

export async function shutdownServerAnalytics() {
  if (cached) {
    await cached.shutdown()
    cached = null
  }
}
