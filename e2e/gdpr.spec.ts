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
    'Required env vars missing. Run: set -a && source .env.local && set +a && npm run test:e2e -- e2e/gdpr.spec.ts',
  )
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = postgres(DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(pgClient, { schema })

const email = `gdpr+${Date.now()}@lexilift.test`
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
    slug: `e2e-gdpr-${Date.now()}`,
    createdBy: userId,
    onboardingCompletedAt: new Date(),
  })
  await db.insert(schema.profiles).values({
    id: userId,
    fullName: 'GDPR E2E User',
    currentOrgId: orgId,
  })
  await db.insert(schema.memberships).values({
    orgId,
    userId,
    role: 'owner',
  })
})

test.afterAll(async () => {
  if (userId) {
    try {
      await db
        .update(schema.profiles)
        .set({ deletedAt: null, deletionScheduledFor: null })
        .where(eq(schema.profiles.id, userId))
    } catch {}
  }
  if (orgId) {
    try {
      await db.delete(schema.documents).where(eq(schema.documents.orgId, orgId))
    } catch {}
    try {
      await db
        .delete(schema.memberships)
        .where(eq(schema.memberships.orgId, orgId))
    } catch {}
    try {
      await db
        .delete(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
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

test('user can export data, request deletion, and cancel deletion', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/dashboard/settings')

  const exportButton = page.getByRole('button', { name: /download my data/i })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^lexilift-export-\d{4}-\d{2}-\d{2}\.json$/)

  await page.getByRole('tab', { name: /danger/i }).click()

  await page.getByRole('button', { name: /delete my account/i }).click()
  await page.getByTestId('delete-confirm-input').fill('DELETE')
  await page.getByRole('button', { name: /^delete account$/i }).click()
  await page.waitForURL(/\/goodbye/)

  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/dashboard/settings')
  await page.getByRole('tab', { name: /danger/i }).click()
  await page.getByRole('button', { name: /keep my account/i }).click()
  await expect(page.getByText(/cancellation confirmed/i)).toBeVisible({ timeout: 15_000 })
})
