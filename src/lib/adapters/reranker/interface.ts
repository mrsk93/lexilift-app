export interface RerankerResult {
  index: number
  document: string
  relevance_score: number
}

export interface RerankerAdapter {
  rerank(query: string, documents: string[]): Promise<RerankerResult[]>
}
