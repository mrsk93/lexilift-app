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
