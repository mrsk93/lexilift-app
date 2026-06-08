import { VectorStoreAdapter, Chunk, Match } from './interface'
import { Pinecone } from '@pinecone-database/pinecone'
import { env } from '@/lib/env'
import { EMBEDDING_DIMENSION } from '@/lib/llm/embeddings'

export class PineconeAdapter implements VectorStoreAdapter {
  private pc: Pinecone
  private indexName: string

  constructor() {
    this.pc = new Pinecone({ apiKey: env.PINECONE_API_KEY || '' })
    this.indexName = env.PINECONE_INDEX || 'lexilift'
    if (env.PINECONE_API_KEY) {
      void this.checkDimension().catch(() => {
        // Surfaced via the warn below; no need to throw — the actual
        // upsert will fail with a more specific error.
      })
    }
  }

  /**
   * Compare the configured embedding dimension with the index's actual
   * dimension. If they differ, log a single clear warning with the
   * remediation steps (otherwise the upsert fails with a cryptic
   * "Vector dimension N does not match the dimension of the index M"
   * deep in the SDK stack).
   */
  private async checkDimension(): Promise<void> {
    try {
      const desc = await this.pc.describeIndex(this.indexName)
      if (desc.dimension !== EMBEDDING_DIMENSION) {
        console.warn(
          `[pinecone] Dimension mismatch: index "${this.indexName}" is ` +
            `${desc.dimension}-dim, but EMBEDDING_DIMENSION=${EMBEDDING_DIMENSION}. ` +
            `Either set EMBEDDING_DIMENSION=${desc.dimension} in .env, or ` +
            `recreate the index in the Pinecone dashboard with the new ` +
            `dimension. Cosine metric is recommended.`
        )
      }
    } catch {
      // describeIndex may fail (auth, network) — silently fall through;
      // the upsert will surface the real error.
    }
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
      const cleanBatch = batch.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { embedding: _embedding, ...restMetadata } = r.metadata as Record<string, any>
        return {
          id: r.id,
          values: r.values,
          metadata: restMetadata,
        }
      })
      // index.upsert() takes an options object { records, namespace }, not a raw array.
      // Passing the array directly made the SDK read options.records as undefined
      // and throw "Must pass in at least 1 record to upsert."
      await index.upsert({ records: cleanBatch, namespace })
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
