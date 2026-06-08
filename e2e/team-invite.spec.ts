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
const TEST_ROUTES_ENABLED = process.env.ENABLE_TEST_ROUTES

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DATABASE_URL) {
  throw new Error(
    'Required env vars missing. Run: set -a && source .env.local && set +a && npm run test:e2e -- e2e/team-invite.spec.ts',
  )
}
if (TEST_ROUTES_ENABLED !== '1') {
  throw new Error(
    'ENABLE_TEST_ROUTES=1 must be set so the /api/test/invites endpoint will respond.',
  )
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = postgres(DATABASE_URL, { prepare: false, max: 1 })
const db = drizzle(pgClient, { schema })

const password = 'TestPassword123!'
const ownerEmail = `owner+${Date.now()}@lexilift.test`
const inviteeEmail = `invitee+${Date.now()}@lexilift.test`
const ownerName = 'Owner E2E'
const inviteeName = 'Invitee E2E'

let ownerUserId: string | undefined
let inviteeUserId: string | undefined
let orgId: string | undefined

test.setTimeout(180_000)

test.beforeAll(async () => {
  const { data: ownerData, error: ownerErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
  })
  if (ownerErr || !ownerData.user) {
    throw new Error(`Failed to create owner: ${ownerErr?.message ?? 'no user returned'}`)
  }
  ownerUserId = ownerData.user.id

  const { data: inviteeData, error: inviteeErr } = await admin.auth.admin.createUser({
    email: inviteeEmail,
    password,
    email_confirm: true,
  })
  if (inviteeErr || !inviteeData.user) {
    throw new Error(`Failed to create invitee: ${inviteeErr?.message ?? 'no user returned'}`)
  }
  inviteeUserId = inviteeData.user.id

  orgId = crypto.randomUUID()
  await db.insert(schema.organizations).values({
    id: orgId,
    name: `${ownerEmail.split('@')[0]}'s Workspace`,
    slug: `e2e-invite-${Date.now()}`,
    createdBy: ownerUserId,
    onboardingCompletedAt: new Date(),
  })
  await db.insert(schema.profiles).values({
    id: ownerUserId,
    fullName: ownerName,
    currentOrgId: orgId,
  })
  await db.insert(schema.memberships).values({
    orgId,
    userId: ownerUserId,
    role: 'owner',
  })
  await db.insert(schema.profiles).values({
    id: inviteeUserId,
    fullName: inviteeName,
  })
})

test.afterAll(async () => {
  if (orgId) {
    try {
      await db
        .delete(schema.invites)
        .where(eq(schema.invites.orgId, orgId))
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
  if (ownerUserId) {
    try {
      await db.delete(schema.profiles).where(eq(schema.profiles.id, ownerUserId))
    } catch {}
    try {
      await admin.auth.admin.deleteUser(ownerUserId)
    } catch {}
  }
  if (inviteeUserId) {
    try {
      await db.delete(schema.profiles).where(eq(schema.profiles.id, inviteeUserId))
    } catch {}
    try {
      await admin.auth.admin.deleteUser(inviteeUserId)
    } catch {}
  }
  await pgClient.end()
})

test('owner can invite, second user can accept and see workspace', async ({ browser }) => {
  const ownerCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()

  await owner.goto('/login')
  await owner.getByLabel(/email/i).fill(ownerEmail)
  await owner.getByLabel(/password/i).fill(password)
  await owner.getByRole('button', { name: /sign in/i }).click()
  await owner.waitForURL(/\/dashboard/)
  await owner.goto('/dashboard/team')

  const [createdInvite] = await db
    .insert(schema.invites)
    .values({
      orgId: orgId!,
      email: inviteeEmail,
      role: 'member',
      invitedBy: ownerUserId!,
    })
    .returning({ id: schema.invites.id })
  const token = createdInvite.id

  const linkRes = await owner.request.get(`/api/test/invites?email=${encodeURIComponent(inviteeEmail)}`)
  expect(linkRes.ok()).toBeTruthy()
  const linkJson = await linkRes.json()
  expect(linkJson.token).toBe(token)

  const inviteeCtx = await browser.newContext()
  const invitee = await inviteeCtx.newPage()
  await invitee.goto('/login')
  await invitee.getByLabel(/email/i).fill(inviteeEmail)
  await invitee.getByLabel(/password/i).fill(password)
  await Promise.all([
    invitee.waitForURL(/\/(dashboard|login)/, { timeout: 15_000 }),
    invitee.getByRole('button', { name: /sign in/i }).click(),
  ])

  await invitee.goto(`/team/invite/${token}`)
  await invitee.waitForURL(/\/dashboard$/, { timeout: 30_000 })

  await invitee.goto('/dashboard/team')
  await expect(invitee.getByText(ownerName, { exact: true })).toBeVisible({ timeout: 15_000 })
})
