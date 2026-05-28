export interface Chunk {
  id: string
  text: string
  metadata: Record<string, any>
}

export interface Match {
  id: string
  score: number
  metadata?: Record<string, any>
}

export interface VectorStoreAdapter {
  upsert(chunks: Chunk[], namespace: string): Promise<void>
  query(embedding: number[], namespace: string, topK: number): Promise<Match[]>
  delete(ids: string[], namespace: string): Promise<void>
}
