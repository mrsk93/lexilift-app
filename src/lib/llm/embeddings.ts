/**
 * Embedding config. Centralized so the Inngest processor and the RAG chain
 * stay in lockstep.
 *
 * Pinecone's index dimension MUST match `EMBEDDING_DIMENSION` (from env,
 * default 1536). If you change one, change the other and recreate the index.
 */
import { env } from '@/lib/env'

export const EMBEDDING_DIMENSION = env.EMBEDDING_DIMENSION
export const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * OpenAI's text-embedding-3 family allows a custom `dimensions` parameter
 * which truncates the vector. We always send our configured dimension so
 * the model output matches the index dimension.
 */
export const openAIEmbeddingOptions = {
  modelName: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSION,
} as const

/**
 * Build a mock embedding (used when OPENAI_API_KEY is missing). The shape
 * must match EMBEDDING_DIMENSION or the upsert to Pinecone will fail.
 */
export function makeMockEmbedding(): number[] {
  return Array(EMBEDDING_DIMENSION).fill(0.1)
}
