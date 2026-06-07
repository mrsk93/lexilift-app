import { inngest, documentUploaded, documentUrlSubmitted } from '../client'
import { db } from '@/lib/db/client'
import { documents, documentChunks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { parsePdf } from '@/lib/parsers/pdf'
import { parseDocx } from '@/lib/parsers/docx'
import { parseText } from '@/lib/parsers/text'
import { fetchAndParseUrl } from '@/lib/parsers/url'
import { splitText } from '@/lib/langchain/chunking'
import { getVectorStore } from '@/lib/adapters/vector-store/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '@/lib/env'
import { v4 as uuidv4 } from 'uuid'
import { trackServerEvent } from '@/lib/analytics/posthog-server'

const DIM = 1536

export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    retries: 3,
    triggers: [documentUploaded, documentUrlSubmitted],
  },
  async ({ event, step }) => {
    const isUrlEvent = event.name === 'document/url.submitted'
    const docId = isUrlEvent
      ? (event.data as { documentId: string; url: string }).documentId
      : (event.data as { docId: string }).docId

    const doc = await step.run('load-doc', async () => {
      const rows = await db
        .select()
        .from(documents)
        .where(eq(documents.id, docId))
        .limit(1)
      return rows[0]
    })
    if (!doc) throw new Error(`Document ${docId} not found`)

    let text: string

    if (isUrlEvent) {
      const url = (event.data as { documentId: string; url: string }).url
      const result = await step.run('fetch-url', () => fetchAndParseUrl(url))
      text = result.text
      await step.run('set-url-name', () =>
        db
          .update(documents)
          .set({ name: result.title })
          .where(eq(documents.id, docId))
      )
    } else {
      const buffer = await step.run('download', async () => {
        const r = await fetch(doc.fileUrl!)
        if (!r.ok) throw new Error(`Storage download failed: ${r.statusText}`)
        return Buffer.from(await r.arrayBuffer())
      })

      text = await step.run('parse', async () => {
        if (doc.fileType === 'application/pdf') return parsePdf(buffer)
        if (doc.fileType?.includes('word')) return parseDocx(buffer)
        return parseText(buffer)
      })
    }

    const chunks = await step.run('chunk', async () => splitText(text))
    if (chunks.length === 0) {
      await step.run('mark-empty', () =>
        db
          .update(documents)
          .set({ status: 'ready', chunkCount: 0 })
          .where(eq(documents.id, docId))
      )
      return { docId, chunkCount: 0 }
    }

    const vectors = await step.run('embed', async () => {
      if (!env.OPENAI_API_KEY) {
        return chunks.map(() => new Array(DIM).fill(0.1))
      }
      const emb = new OpenAIEmbeddings({
        openAIApiKey: env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small',
      })
      return emb.embedDocuments(chunks.map((c) => c.pageContent))
    })

    await step.run('upsert-pinecone', async () => {
      if (!env.PINECONE_API_KEY) return
      const records = chunks.map((c, i) => ({
        id: uuidv4(),
        text: c.pageContent,
        metadata: {
          docId: doc.id,
          chunkIndex: i,
          embedding: vectors[i],
        },
      }))
      await getVectorStore().upsert(records, doc.orgId!)
    })

    await step.run('save-chunks', async () => {
      const rows = chunks.map((c, i) => ({
        id: uuidv4(),
        orgId: doc.orgId!,
        docId: doc.id,
        chunkIndex: i,
        content: c.pageContent,
        metadata: c.metadata,
        pineconeId: '',
      }))
      if (rows.length) await db.insert(documentChunks).values(rows)
    })

    await step.run('mark-ready', () =>
      db
        .update(documents)
        .set({ status: 'ready', chunkCount: chunks.length })
        .where(eq(documents.id, docId))
    )

    await trackServerEvent({
      distinctId: doc.uploadedBy,
      event: 'document.uploaded',
      properties: {
        orgId: doc.orgId,
        documentId: doc.id,
        fileType: doc.fileType,
      },
    })

    return { docId, chunkCount: chunks.length }
  }
)
