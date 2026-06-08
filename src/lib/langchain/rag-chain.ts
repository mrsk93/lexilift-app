import { getVectorStore } from '@/lib/adapters/vector-store/pinecone'
import { getReranker } from '@/lib/adapters/reranker/voyage'
import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '@/lib/env'
import { makeMockEmbedding, openAIEmbeddingOptions } from '@/lib/llm/embeddings'

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
  const matches = await vectorStore.query(queryEmbedding, orgId, 20)
  
  if (matches.length === 0) return []

  const chunksText: string[] = matches.map(m => {
    const text = m.metadata?.text
    return typeof text === 'string' ? text : ''
  })

  // 3. Rerank using Voyage AI
  const reranker = getReranker()
  const rerankedResults = await reranker.rerank(query, chunksText)

  // 4. Return top K contexts (e.g. top 5)
  return rerankedResults.map((r) => {
    const source = matches[r.index]
    return {
      text: chunksText[r.index] ?? '',
      score: r.relevance_score,
      metadata: source?.metadata,
    }
  })
}

export interface ContextItem {
  text: string
  score?: number
  metadata?: Record<string, unknown>
}

export function buildContextPrompt(query: string, contextItems: ContextItem[]) {
  const contextStr = contextItems
    .map((item, idx) => `[Source ${idx + 1} | Doc: ${item.metadata?.docId || 'Unknown'}]\n${item.text}`)
    .join('\n\n')
    
  return `Answer the user's question using ONLY the provided context below. If the answer is not contained in the context, say "I don't have enough information to answer that based on the provided documents."
  
Always cite your sources using the [Source X] format.

Context:
${contextStr}

User Question: ${query}`
}
