/**
 * Recreate the Pinecone index at the dimension matching EMBEDDING_DIMENSION.
 *
 * Usage:
 *   node scripts/recreate-pinecone-index.mjs
 *
 * Requires a working PINECONE_API_KEY in .env.local. Will:
 *   1. Delete the existing index (if it exists)
 *   2. Wait for the delete to complete
 *   3. Create a new index with EMBEDDING_DIMENSION
 *   4. Wait for the new index to be ready
 */
import { Pinecone } from '@pinecone-database/pinecone'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') })
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10)
const INDEX_NAME = process.env.PINECONE_INDEX || 'lexilift'

if (!process.env.PINECONE_API_KEY) {
  console.error('✗ PINECONE_API_KEY is missing. Add it to .env.local.')
  process.exit(1)
}

console.log(`Target: index="${INDEX_NAME}" dimension=${EMBEDDING_DIMENSION}`)

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })

async function waitReady(idxName) {
  for (let i = 0; i < 30; i++) {
    try {
      const desc = await pc.describeIndex(idxName)
      if (desc.status?.ready) return desc
    } catch {
      // not yet
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Timed out waiting for index to be ready')
}

try {
  const existing = await pc.listIndexes()
  if (existing.indexes?.some((i) => i.name === INDEX_NAME)) {
    console.log(`Deleting existing index "${INDEX_NAME}"...`)
    await pc.deleteIndex(INDEX_NAME)
    console.log('Waiting for delete to complete...')
    // The describe call will fail until the index is gone
    for (let i = 0; i < 30; i++) {
      const list = await pc.listIndexes()
      if (!list.indexes?.some((i) => i.name === INDEX_NAME)) break
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
} catch (e) {
  console.error('listIndexes error:', e.message)
  process.exit(1)
}

console.log(`Creating index "${INDEX_NAME}" with dimension=${EMBEDDING_DIMENSION}, metric=cosine...`)
try {
  await pc.createIndex({
    name: INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
    metric: 'cosine',
    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
  })
} catch (e) {
  console.error('createIndex error:', e.message)
  process.exit(1)
}

console.log('Waiting for new index to be ready...')
const desc = await waitReady(INDEX_NAME)
console.log(`✓ Index "${INDEX_NAME}" is ready: dimension=${desc.dimension}, metric=${desc.metric}`)
console.log('')
console.log('Next steps:')
console.log('  1. Re-process existing documents: visit /dashboard/documents, click "Reprocess" on each')
console.log('  2. New uploads will embed at the correct dimension automatically')
