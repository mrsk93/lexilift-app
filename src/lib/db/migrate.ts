import fs from 'fs'
import path from 'path'
import postgres from 'postgres'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const run = async () => {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const client = postgres(url, { max: 1 })

  const dir = path.join(process.cwd(), 'src/lib/db/migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    let sql = fs.readFileSync(path.join(dir, file), 'utf8')
    sql = sql.replace(/CREATE TABLE/g, 'CREATE TABLE IF NOT EXISTS')
             .replace(/CREATE POLICY/g, 'CREATE POLICY')
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      try { await client.unsafe(stmt) }
      catch (e: any) {
        if (e.message.includes('already exists')) continue
        console.warn(`[${file}]`, e.message)
      }
    }
    console.log(`✓ ${file}`)
  }
  await client.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
