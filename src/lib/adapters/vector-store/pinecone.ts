import { VectorStoreAdapter, Chunk, Match } from './interface'

export class PineconeAdapter implements VectorStoreAdapter {
  async upsert(chunks: Chunk[], namespace: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async query(embedding: number[], namespace: string, topK: number): Promise<Match[]> {
    throw new Error('Method not implemented.')
  }

  async delete(ids: string[], namespace: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

export function getVectorStore(): VectorStoreAdapter {
  return new PineconeAdapter()
}
