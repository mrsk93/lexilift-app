import { Inngest, eventType, staticSchema } from 'inngest'

type Events = {
  'document/uploaded': { data: { docId: string } }
  'document/url.submitted': { data: { documentId: string; url: string } }
  'document/process': { data: { docId: string } }
  'subscription/sync': { data: { orgId: string } }
}

export const documentUploaded = eventType('document/uploaded', {
  schema: staticSchema<Events['document/uploaded']['data']>(),
})

export const documentUrlSubmitted = eventType('document/url.submitted', {
  schema: staticSchema<Events['document/url.submitted']['data']>(),
})

export const documentProcess = eventType('document/process', {
  schema: staticSchema<Events['document/process']['data']>(),
})

export const subscriptionSync = eventType('subscription/sync', {
  schema: staticSchema<Events['subscription/sync']['data']>(),
})

export const inngest = new Inngest({
  id: 'lexilift',
  isDev: process.env.NODE_ENV !== 'production',
})

/**
 * Send a single Inngest event with a graceful no-op fallback when Inngest
 * is not configured (no keys, dev server not running). Avoids the noisy
 * "fetch failed" stack trace on every upload in fresh dev environments.
 */
let warnedMissing = false
export async function safeSend(event: { name: string; data: unknown }) {
  try {
    await inngest.send(event as Parameters<typeof inngest.send>[0])
  } catch {
    if (!warnedMissing) {
      warnedMissing = true
      console.warn(
        `[inngest] Event "${event.name}" could not be sent (Inngest dev server not running?). ` +
          `Subsequent failures will be silenced. Start the dev server with \`npm run dev:inngest\`.`
      )
    }
  }
}
