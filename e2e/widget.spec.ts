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
    'Required env vars missing. Run: set -a && source .env.local && set +a && npm run test:e2e -- e2e/widget.spec.ts',
  )
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = postgres(DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(pgClient, { schema })

const ownerEmail = `wowner+${Date.now()}@lexilift.test`
const password = 'TestPassword123!'

let userId: string | undefined
let orgId: string | undefined

test.setTimeout(180_000)

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email: ownerEmail,
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
    name: `${ownerEmail.split('@')[0]}'s Workspace`,
    slug: `e2e-widget-${Date.now()}`,
    createdBy: userId,
    onboardingCompletedAt: new Date(),
  })
  await db.insert(schema.profiles).values({
    id: userId,
    fullName: 'Widget E2E Owner',
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
      await db
        .delete(schema.widgetTokens)
        .where(eq(schema.widgetTokens.orgId, orgId))
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

test('owner creates a widget, visitor opens it and gets a chat answer', async ({ browser }) => {
  const ownerCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()

  await owner.goto('/login')
  await owner.getByLabel(/email/i).fill(ownerEmail)
  await owner.getByLabel(/password/i).fill(password)
  await owner.getByRole('button', { name: /sign in/i }).click()
  await owner.waitForURL(/\/dashboard/)

  await owner.goto('/dashboard/widget')
  await owner.getByRole('button', { name: /new widget/i }).click()
  await owner.getByLabel(/name/i).fill('E2E test site')
  await owner.getByRole('button', { name: /^create$/i }).click()

  await expect(owner.locator('code').first()).toBeVisible({ timeout: 15_000 })
  const snippet = (await owner.locator('code').first().textContent()) ?? ''
  const match = snippet.match(/\/widget\/([^/]+)\/embed/)
  if (!match) throw new Error(`token not found in snippet: ${snippet}`)
  const token = match[1]

  await ownerCtx.close()

  const visitorCtx = await browser.newContext()
  const visitor = await visitorCtx.newPage()

  await visitor.goto(`/widget/${token}`)
  await visitor.getByRole('button', { name: /open chat/i }).click()
  const widgetInput = visitor.getByPlaceholder(/ask a question/i)
  await widgetInput.fill('What can you do?')
  await widgetInput.press('Enter')

  await expect(
    visitor.getByText(/I don.?t have enough information|sources? \[/i),
  ).toBeVisible({ timeout: 60_000 })

  await visitorCtx.close()
})
