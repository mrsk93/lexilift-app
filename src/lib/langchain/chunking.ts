import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export const getTextSplitter = (chunkSize = 1000, chunkOverlap = 200) => {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  })
}

export async function splitText(text: string, chunkSize = 1000, chunkOverlap = 200) {
  const splitter = getTextSplitter(chunkSize, chunkOverlap)
  const docs = await splitter.createDocuments([text])
  return docs
}
