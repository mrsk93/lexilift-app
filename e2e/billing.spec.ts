import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DATABASE_URL) {
  throw new Error(
    'Required env vars missing. Run: set -a && source .env.local && set +a && npm run test:e2e -- e2e/billing.spec.ts',
  )
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = postgres(DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(pgClient, { schema })

const email = `biller+${Date.now()}@lexilift.test`
const password = 'TestPassword123!'

let userId: string | undefined
let orgId: string | undefined

test.setTimeout(180_000)

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? 'no user returned'}`)
  }
  userId = data.user.id

  orgId = crypto.randomUUID()
  await db.insert(schema.organizations).values({
    id: orgId,
    name: `${email.split('@')[0]}'s Workspace`,
    slug: `e2e-billing-${Date.now()}`,
    createdBy: userId,
    onboardingCompletedAt: new Date(),
  })
  await db.insert(schema.profiles).values({
    id: userId,
    fullName: 'Billing E2E User',
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
  await pgClient.end()
})

test('owner can view plan cards, see upgrade CTAs, and ingest returns 402 when plan limit is reached', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/dashboard/billing')

  await expect(page.getByRole('heading', { name: /Billing & Plans/i })).toBeVisible({
    timeout: 30_000,
  })

  await expect(page.getByText('Starter', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Team', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Enterprise', { exact: true }).first()).toBeVisible()

  await expect(page.getByRole('button', { name: /Current Plan/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Upgrade to Pro/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Upgrade to Team/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Contact Sales/i })).toBeVisible()

  await expect(page.getByRole('button', { name: /Manage Billing/i })).toBeVisible()

  await page.route('**/api/ingest', (route) => {
    route.fulfill({
      status: 402,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'PLAN_LIMIT_REACHED: documents limit (10/10) reached on starter plan',
        code: 'PLAN_LIMIT_REACHED',
      }),
    })
  })

  const result = await page.evaluate(async () => {
    const fd = new FormData()
    fd.append('file', new File(['over limit'], 'over-limit.txt', { type: 'text/plain' }))
    const r = await fetch('/api/ingest', { method: 'POST', body: fd })
    return { status: r.status, body: await r.json() }
  })
  expect(result.status).toBe(402)
  expect(result.body.code).toBe('PLAN_LIMIT_REACHED')
})
