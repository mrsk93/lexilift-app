export interface CitationRef {
  index: number
  documentId: string
  chunkId: string
}

export interface ParsedAnswer {
  text: string
  citations: CitationRef[]
}
