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
    'Required env vars missing. Run: set -a && source .env.local && set +a && npm run test:e2e -- e2e/signup-onboarding-chat.spec.ts',
  )
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = postgres(DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(pgClient, { schema })

const email = `e2e+${Date.now()}@lexilift.test`
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
    slug: `e2e-${Date.now()}`,
    createdBy: userId,
  })
  await db.insert(schema.profiles).values({
    id: userId,
    fullName: 'E2E User',
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

test('user can sign up, onboard, upload a doc, and chat', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard\/onboarding/)
  await page.getByText(/step 1 of 3/i).waitFor({ timeout: 90_000 })
  await page.getByLabel(/workspace name/i).fill('E2E Workspace')
  await page.getByRole('button', { name: /continue/i }).click()

  await page.getByRole('button', { name: /skip/i }).click()

  await page.getByRole('button', { name: /open dashboard/i }).click()
  await page.waitForURL(/\/dashboard$/)

  await page.goto('/dashboard/documents')
  await page.setInputFiles('input[type="file"]', {
    name: 'hello.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('LexiLift e2e: hello world.'),
  })
  await page.getByRole('button', { name: /upload files/i }).click()
  await expect(
    page.getByRole('button', { name: /upload files/i }),
  ).not.toBeVisible({ timeout: 30_000 })
  await page.reload()
  await expect(page.getByText('ready', { exact: true })).toBeVisible({
    timeout: 60_000,
  })

  await page.goto('/dashboard/chat')
  await page.getByRole('button', { name: /new chat/i }).click()
  await page.waitForURL(/\/dashboard\/chat\//)
  const chatInput = page.locator('input[placeholder*="Ask" i]')
  await chatInput.fill('What does the document say?')
  await chatInput.press('Enter')

  await expect(page.getByText(/hello world/i)).toBeVisible({ timeout: 60_000 })
})
