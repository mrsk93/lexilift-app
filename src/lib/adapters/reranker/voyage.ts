import { RerankerAdapter } from './interface'
import { env } from '@/lib/env'

export class VoyageReranker implements RerankerAdapter {
  private apiKey: string

  constructor() {
    this.apiKey = env.VOYAGE_API_KEY || ''
  }

  async rerank(query: string, documents: string[]): Promise<any[]> {
    if (!this.apiKey) {
      // Mock reranker if no API key
      return documents.map((doc, index) => ({
        index,
        document: doc,
        relevance_score: 0.9 - (index * 0.1)
      }))
    }

    try {
      const response = await fetch('https://api.voyageai.com/v1/rerank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          documents,
          model: 'rerank-2.5-lite',
          top_k: Math.min(documents.length, 5)
        })
      })

      if (!response.ok) {
        throw new Error(`Voyage API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Reranking failed', error)
      return documents.map((doc, index) => ({
        index,
        document: doc,
        relevance_score: 0.9 - (index * 0.1)
      }))
    }
  }
}

export function getReranker(): RerankerAdapter {
  return new VoyageReranker()
}
