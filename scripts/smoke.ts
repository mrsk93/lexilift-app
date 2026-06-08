#!/usr/bin/env tsx
import { setTimeout as wait } from 'node:timers/promises'

const base = process.env.SMOKE_URL ?? 'http://localhost:3000'
const checks: Array<{ name: string; path: string; expect: number }> = [
  { name: 'Landing', path: '/', expect: 200 },
  { name: 'Health', path: '/api/health', expect: 200 },
  { name: 'Ready', path: '/api/ready', expect: 200 },
  { name: 'Sitemap', path: '/sitemap.xml', expect: 200 },
  { name: 'Robots', path: '/robots.txt', expect: 200 },
  { name: 'Login', path: '/login', expect: 200 },
  { name: 'Signup', path: '/signup', expect: 200 },
  { name: 'Pricing', path: '/pricing', expect: 200 },
  { name: 'Help', path: '/help', expect: 200 },
  { name: 'Terms', path: '/terms', expect: 200 },
  { name: 'Privacy', path: '/privacy', expect: 200 },
  { name: 'DPA', path: '/dpa', expect: 200 },
  { name: 'Dashboard (redirect)', path: '/dashboard', expect: 307 },
  { name: 'Not found', path: '/does-not-exist', expect: 404 },
]

let failed = 0
for (const c of checks) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${base}${c.path}`, { redirect: 'manual' })
      if (r.status === c.expect) {
        console.log(`✓ ${c.name}: ${r.status}`)
        break
      }
      if (attempt === 2) {
        console.error(`✗ ${c.name}: expected ${c.expect}, got ${r.status}`)
        failed++
      } else { await wait(1000) }
    } catch (err) {
      if (attempt === 2) { console.error(`✗ ${c.name}: ${(err as Error).message}`); failed++ }
      else await wait(1000)
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed.`)
  process.exit(1)
}
console.log('\nAll smoke checks passed.')
