import { inngest, documentUploaded } from '../client'

export const processDocument = inngest.createFunction(
  { id: 'process-document', triggers: [documentUploaded] },
  async ({ event, step }) => {
    return { ok: true, docId: event.data.docId }
  }
)
