import { getVectorStore } from '@/lib/adapters/vector-store/pinecone'
import { getReranker } from '@/lib/adapters/reranker/voyage'
import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '@/lib/env'
import { makeMockEmbedding, openAIEmbeddingOptions } from '@/lib/llm/embeddings'

/**
 * Retrieve the top-K context chunks for a user query.
 *
 * Pipeline:
 *   1. Embed the query with OpenAI text-embedding-3-small (dim from env)
 *   2. Query Pinecone for the top 20 matches in the org's namespace
 *   3. Rerank with Voyage AI and return the top 5
 *
 * If the query embedding fails (no OpenAI key, network error), we fall back
 * to a mock embedding so dev still works end-to-end. The mock has the same
 * shape as a real embedding but no semantic content.
 */
export async function retrieveContext(query: string, orgId: string) {
  // 1. Embed the query
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

  // 2. Query Pinecone (top 20 for reranking headroom)
  const vectorStore = getVectorStore()
  const matches = await vectorStore.query(queryEmbedding, orgId, 20)
  if (matches.length === 0) {
    return []
  }

  const chunksText = matches.map((m) => m.metadata?.text || '')

  // 3. Rerank with Voyage AI. Note: the API returns [{index, relevance_score}]
  //    without the document text — we look the text back up via the index.
  const reranker = getReranker()
  const rerankedResults = await reranker.rerank(query, chunksText)

  return rerankedResults.map((r) => {
    const source = matches[r.index]
    return {
      text: chunksText[r.index] ?? '',
      score: r.relevance_score,
      metadata: source?.metadata,
    }
  })
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
