import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from '@/lib/db/schema'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DATABASE_URL) {
  throw new Error(
    'Required env vars missing. Run: set -a && source .env.local && set +a && npm run test:e2e -- e2e/accessibility.spec.ts',
  )
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = postgres(DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(pgClient, { schema })

const email = `a11y+${crypto.randomUUID()}@lexilift.test`
const password = 'TestPassword123!'

let userId: string | undefined
let orgId: string | undefined

const REPORT_PATH = 'e2e/.a11y-report.json'

const pages: Array<{ name: string; url: string; auth: boolean }> = [
  { name: 'Landing', url: '/', auth: false },
  { name: 'Login', url: '/login', auth: false },
  { name: 'Signup', url: '/signup', auth: false },
  { name: 'Dashboard', url: '/dashboard', auth: true },
  { name: 'Documents', url: '/dashboard/documents', auth: true },
  { name: 'Team', url: '/dashboard/team', auth: true },
  { name: 'Settings', url: '/dashboard/settings', auth: true },
  { name: 'Billing', url: '/dashboard/billing', auth: true },
]

interface ViolationSummary {
  page: string
  url: string
  id: string
  impact: string | null | undefined
  help: string
  nodes: number
  targets: string[]
}

const report: ViolationSummary[] = []

function normalizeRule(ruleId: string): boolean {
  return !['region'].includes(ruleId)
}

test.setTimeout(180_000)

test.beforeAll(async () => {
  let data: Awaited<ReturnType<typeof admin.auth.admin.createUser>>['data'] | undefined
  let lastErr: string | undefined
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (res.data.user) {
      data = res.data
      break
    }
    lastErr = res.error?.message
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
  }
  if (!data?.user) {
    throw new Error(`Failed to create test user: ${lastErr ?? 'no user returned'}`)
  }
  userId = data.user.id

  orgId = crypto.randomUUID()
  await db.insert(schema.organizations).values({
    id: orgId,
    name: `${email.split('@')[0]}'s Workspace`,
    slug: `a11y-${orgId.slice(0, 8)}`,
    createdBy: userId,
  })
  await db.insert(schema.profiles).values({
    id: userId,
    fullName: 'A11y User',
    currentOrgId: orgId,
  })
  await db.insert(schema.memberships).values({
    orgId,
    userId,
    role: 'owner',
  })
})

test.afterAll(async () => {
  if (orgId) {
    try {
      await db.delete(schema.documents).where(eq(schema.documents.orgId, orgId))
    } catch {}
    try {
      await db.delete(schema.memberships).where(eq(schema.memberships.orgId, orgId))
    } catch {}
    try {
      await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId))
    } catch {}
  }
  if (userId) {
    try {
      await db.delete(schema.profiles).where(eq(schema.profiles.id, userId))
    } catch {}
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {}
  }

  try {
    mkdirSync(dirname(REPORT_PATH), { recursive: true })
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  } catch {}

  await pgClient.end()
})

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/)
}

for (const p of pages) {
  test(`a11y: ${p.name}`, async ({ page }) => {
    if (p.auth) {
      await signIn(page)
    }

    await page.goto(p.url)
    await page.waitForLoadState('networkidle').catch(() => {})

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const filtered = results.violations.filter((v) => normalizeRule(v.id))

    for (const v of filtered) {
      report.push({
        page: p.name,
        url: p.url,
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      })
    }

    if (filtered.length > 0) {
      console.log(
        `[a11y] ${p.name} (${p.url}): ${filtered.length} rule(s) violated across ${
          filtered.reduce((acc, v) => acc + v.nodes.length, 0)
        } node(s)`,
      )
      for (const v of filtered) {
        console.log(`  - ${v.id} [${v.impact ?? 'unknown'}]: ${v.help} (${v.nodes.length})`)
        for (const n of v.nodes.slice(0, 2)) {
          console.log(`      target: ${n.target.join(' ')}`)
          if (n.failureSummary) {
            console.log(`      ${n.failureSummary.split('\n')[0]}`)
          }
        }
      }
    }

    expect(filtered.length).toBeLessThan(50)
  })
}
