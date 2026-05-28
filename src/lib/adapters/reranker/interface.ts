export interface RerankerAdapter {
  rerank(query: string, documents: string[]): Promise<any[]>
}
