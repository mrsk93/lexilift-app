import { getVectorStore } from '@/lib/adapters/vector-store/pinecone'
import { getReranker } from '@/lib/adapters/reranker/voyage'
import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '@/lib/env'
import { makeMockEmbedding, openAIEmbeddingOptions } from '@/lib/llm/embeddings'
import { db } from '@/lib/db/client'
import { documentChunks } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

/**
 * Postgres full-text fallback used when Pinecone returns 0 matches or errors.
 * Uses websearch_to_tsquery to handle natural-language queries, plus an
 * ILIKE substring boost so very short queries still get something useful.
 *
 * Returns the same shape as the Pinecone path (Match[]) so the downstream
 * code (rerank, prompt build) is unchanged.
 */
async function postgresFallback(
  query: string,
  orgId: string,
  topK: number
): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>> {
  try {
    // Natural-language full-text search. websearch_to_tsquery handles phrases
    // and stop-words intelligently. ILIKE is a substring fallback for short
    // queries where tsquery may tokenize too aggressively.
    const rows = await db
      .select({
        id: documentChunks.id,
        docId: documentChunks.docId,
        content: documentChunks.content,
        metadata: documentChunks.metadata,
        // Combine FTS rank with an ILIKE substring boost.
        rank: sql<number>`(
          ts_rank(to_tsvector('english', ${documentChunks.content}), websearch_to_tsquery('english', ${query}))
          + CASE WHEN ${documentChunks.content} ILIKE ${'%' + query + '%'} THEN 0.5 ELSE 0 END
        )`.as('rank'),
      })
      .from(documentChunks)
      .where(
        and(
          eq(documentChunks.orgId, orgId),
          sql`(
            to_tsvector('english', ${documentChunks.content}) @@ websearch_to_tsquery('english', ${query})
            OR ${documentChunks.content} ILIKE ${'%' + query + '%'}
          )`
        )
      )
      .orderBy(sql`rank DESC`)
      .limit(topK)

    return rows.map((r) => ({
      id: r.id,
      score: Number(r.rank) || 0,
      metadata: {
        text: r.content,
        docId: r.docId,
        ...(r.metadata ?? {}),
      },
    }))
  } catch (e) {
    console.warn('[rag] Postgres fallback failed:', e instanceof Error ? e.message : e)
    return []
  }
}

export async function retrieveContext(query: string, orgId: string) {
  // 1. Embed Query
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: env.OPENAI_API_KEY || 'mock-key',
    ...openAIEmbeddingOptions,
  })

  let queryEmbedding: number[] = []
  if (env.OPENAI_API_KEY) {
    queryEmbedding = await embeddings.embedQuery(query)
  } else {
    queryEmbedding = makeMockEmbedding()
  }

  // 2. Query Pinecone Vector Store (top 20 for hybrid search/reranking)
  const vectorStore = getVectorStore()
  let matches: Awaited<ReturnType<typeof vectorStore.query>> = []
  try {
    matches = await vectorStore.query(queryEmbedding, orgId, 20)
  } catch (e) {
    console.warn('[rag] Pinecone query failed, falling back to Postgres FTS:', e instanceof Error ? e.message : e)
    matches = []
  }

  // 3. Fallback to Postgres FTS if Pinecone returns nothing (e.g. dead API
  //    key, empty index, or no vectors yet for this org). The DB chunks
  //    are still useful for grounded answers.
  if (matches.length === 0) {
    const fallback = await postgresFallback(query, orgId, 20)
    if (fallback.length === 0) return []
    return fallback.slice(0, 5).map((m) => ({
      text: (m.metadata?.text as string) ?? '',
      score: m.score,
      metadata: m.metadata,
    }))
  }

  const chunksText = matches.map(m => m.metadata?.text || '')

  // 4. Rerank using Voyage AI
  try {
    const reranker = getReranker()
    const rerankedResults = await reranker.rerank(query, chunksText)

    // 5. Return top K contexts (e.g. top 5)
    return rerankedResults.map(r => ({
      text: r.document,
      score: r.relevance_score,
      metadata: matches[r.index]?.metadata
    }))
  } catch (e) {
    console.warn('[rag] Rerank failed, returning raw matches:', e instanceof Error ? e.message : e)
    return matches.slice(0, 5).map(m => ({
      text: (m.metadata?.text as string) ?? '',
      score: m.score,
      metadata: m.metadata,
    }))
  }
}

export function buildContextPrompt(query: string, contextItems: any[]) {
  const contextStr = contextItems
    .map((item, idx) => `[Source ${idx + 1} | Doc: ${item.metadata?.docId || 'Unknown'}]\n${item.text}`)
    .join('\n\n')
    
  return `Answer the user's question using ONLY the provided context below. If the answer is not contained in the context, say "I don't have enough information to answer that based on the provided documents."
  
Always cite your sources using the [Source X] format.

Context:
${contextStr}

User Question: ${query}`
}
