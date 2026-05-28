import { VectorStoreAdapter, Chunk, Match } from './interface'
import { Pinecone } from '@pinecone-database/pinecone'
import { env } from '@/lib/env'

export class PineconeAdapter implements VectorStoreAdapter {
  private pc: Pinecone
  private indexName: string

  constructor() {
    this.pc = new Pinecone({ apiKey: env.PINECONE_API_KEY || '' })
    this.indexName = env.PINECONE_INDEX || 'lexilift'
  }

  async upsert(chunks: Chunk[], namespace: string): Promise<void> {
    const index = this.pc.index(this.indexName).namespace(namespace)
    
    const records = chunks.map(chunk => ({
      id: chunk.id,
      values: chunk.metadata.embedding, // Needs embedding to be passed in metadata or as a separate property
      metadata: {
        text: chunk.text,
        ...chunk.metadata,
      }
    }))
    
    // Pinecone recommends batches of 100 for upserts
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      // Remove embedding from metadata before sending (optional but good practice to save space)
      const cleanBatch = batch.map(r => {
        const { embedding, ...restMetadata } = r.metadata
        return {
          id: r.id,
          values: r.values,
          metadata: restMetadata
        }
      })
      await index.upsert(cleanBatch)
    }
  }

  async query(embedding: number[], namespace: string, topK: number): Promise<Match[]> {
    const index = this.pc.index(this.indexName).namespace(namespace)
    
    const response = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true
    })
    
    return response.matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata
    }))
  }

  async delete(ids: string[], namespace: string): Promise<void> {
    const index = this.pc.index(this.indexName).namespace(namespace)
    await index.deleteMany(ids)
  }
}

export function getVectorStore(): VectorStoreAdapter {
  return new PineconeAdapter()
}
