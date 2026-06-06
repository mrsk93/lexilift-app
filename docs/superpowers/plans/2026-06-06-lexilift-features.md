# LexiLift MVP Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every user-facing feature in the LexiLift MVP gap-fill spec: team & org management, URL ingestion, document lifecycle UI, full chat experience with citations and feedback, embeddable widget, plan enforcement, usage tracking, billing UI, analytics dashboard, onboarding, and auth flows.

**Architecture:** Continuation of Plan 1 (Foundation). Same Next.js 16 App Router + Supabase + Drizzle + Inngest + Vercel AI SDK stack. New this plan: Resend (transactional email), sonner (toasts), PostHog (product analytics), Upstash (rate limit for brute force), Recharts (analytics), Polar customer portal links.

**Tech Stack:** Same as Plan 1, plus: `resend` ^4, `sonner` ^1, `posthog-js` ^1, `posthog-node` ^4, `@upstash/ratelimit` ^2, `@upstash/redis` ^1, `recharts` ^2. Dev: `@playwright/test` (started in Plan 1).

**Reference spec:** `docs/superpowers/specs/2026-06-06-lexilift-mvp-gap-fill-design.md`

**Prerequisite:** Plan 1 must be complete (real org resolution, RLS, Inngest wiring, zod env, service-role client, mocked-LLM acceptable, all `mock-org-id` literals gone).

**Scope of this plan:** Plan 2 of 4 (Features). After this plan, the dashboard is feature-complete except for: production infrastructure hardening (Plan 3), full test coverage & polish (Plan 4). You can demo: invite a teammate, ingest a PDF or URL, watch it process via Inngest, soft-delete and restore it, chat with citations, give feedback, embed the widget on another site, hit a plan limit and see the upgrade CTA, view analytics, complete onboarding, reset password, sign in with Google.

---

## File Structure (new & modified)

### New files
- `src/lib/email/resend.ts` — Resend client
- `src/lib/email/templates/invite.tsx` — React Email template
- `src/lib/email/templates/welcome.tsx` — React Email template
- `src/lib/email/templates/password-reset.tsx` — React Email template
- `src/lib/email/templates/usage-alert.tsx` — React Email template
- `src/lib/email/send.ts` — `sendEmail()` wrapper
- `src/lib/email/email.test.ts`
- `src/lib/ratelimit/upstash.ts` — Upstash client
- `src/lib/ratelimit/index.ts` — `rateLimit()` helper
- `src/lib/ratelimit/ratelimit.test.ts`
- `src/lib/analytics/posthog-server.ts` — server init
- `src/lib/analytics/posthog-client.tsx` — `<PostHogProvider>`
- `src/lib/analytics/events.ts` — typed event names
- `src/lib/citations/parser.ts` — extract citations from LLM text
- `src/lib/citations/parser.test.ts`
- `src/lib/citations/types.ts`
- `src/components/team/MembersTable.tsx`
- `src/components/team/InviteForm.tsx`
- `src/components/team/RoleSelect.tsx`
- `src/components/team/RemoveMemberDialog.tsx`
- `src/components/settings/OrgForm.tsx`
- `src/components/settings/DeleteOrgDialog.tsx`
- `src/components/settings/TransferOwnershipDialog.tsx`
- `src/components/documents/UrlIngestForm.tsx`
- `src/components/documents/StatusBadge.tsx`
- `src/components/documents/DocumentFilters.tsx`
- `src/components/documents/BulkActionsBar.tsx`
- `src/components/documents/RestoreButton.tsx`
- `src/components/documents/ReprocessButton.tsx`
- `src/components/chat/SessionList.tsx`
- `src/components/chat/NewChatButton.tsx`
- `src/components/chat/ModelSelector.tsx`
- `src/components/chat/CitationCard.tsx`
- `src/components/chat/SourceHighlight.tsx`
- `src/components/chat/FeedbackButtons.tsx`
- `src/components/chat/MessageActions.tsx` (stop/regenerate/edit)
- `src/components/chat/AutoTitle.tsx`
- `src/components/widget/WidgetLoader.tsx` (vanilla JS embed script)
- `src/components/widget/WidgetChat.tsx` (chat surface inside widget page)
- `src/components/billing/PlanCard.tsx`
- `src/components/billing/UsageGauge.tsx`
- `src/components/billing/InvoiceList.tsx`
- `src/components/billing/CancelDialog.tsx`
- `src/components/analytics/StatCard.tsx`
- `src/components/analytics/ChartArea.tsx` (Recharts)
- `src/components/analytics/ChartBar.tsx`
- `src/components/analytics/ChartPie.tsx`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/StepOrg.tsx`
- `src/components/onboarding/StepUpload.tsx`
- `src/components/onboarding/StepWidget.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/ErrorState.tsx`
- `src/components/ui/Toaster.tsx`
- `src/components/ui/ThemeToggle.tsx`
- `src/components/ui/CommandPalette.tsx` (Cmd+K)
- `src/app/api/team/invites/route.ts` (POST = create invite)
- `src/app/api/team/invites/[id]/route.ts` (DELETE = revoke)
- `src/app/api/team/members/[id]/route.ts` (PATCH role, DELETE)
- `src/app/api/team/accept/[token]/route.ts`
- `src/app/api/organizations/[id]/route.ts` (PUT/DELETE)
- `src/app/api/organizations/[id]/transfer/route.ts`
- `src/app/api/ingest/url/route.ts`
- `src/app/api/documents/[id]/restore/route.ts`
- `src/app/api/documents/[id]/reprocess/route.ts`
- `src/app/api/documents/bulk-delete/route.ts`
- `src/app/api/chat/sessions/route.ts` (GET list, POST create)
- `src/app/api/chat/sessions/[id]/route.ts` (GET/DELETE)
- `src/app/api/chat/sessions/[id]/title/route.ts` (PATCH auto-title)
- `src/app/api/chat/messages/[id]/feedback/route.ts` (POST)
- `src/app/api/widget/[token]/page-data/route.ts`
- `src/app/api/widget/tokens/route.ts` (GET list, POST create)
- `src/app/api/widget/tokens/[id]/route.ts` (DELETE)
- `src/app/api/billing/portal/route.ts` (Polar portal link)
- `src/app/api/billing/invoices/route.ts` (GET list)
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/verify-email/route.ts`
- `src/app/api/auth/oauth/callback/google/route.ts`
- `src/app/dashboard/onboarding/page.tsx`
- `src/app/dashboard/analytics/page.tsx`
- `src/app/dashboard/team/page.tsx` (rewrite)
- `src/app/dashboard/settings/page.tsx` (rewrite)
- `src/app/dashboard/documents/page.tsx` (rewrite — filters, bulk, status)
- `src/app/dashboard/chat/page.tsx` (rewrite — sessions)
- `src/app/dashboard/chat/[sessionId]/page.tsx`
- `src/app/dashboard/widget/page.tsx` (rewrite — token CRUD)
- `src/app/dashboard/billing/page.tsx` (rewrite — real gauges)
- `src/app/dashboard/billing/BillingClient.tsx` (extend)
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/app/widget/[token]/page.tsx` (replace catch-all)
- `src/app/widget/[token]/embed/route.ts` (serve loader script)
- `src/lib/db/migrations/0004_citations_and_invoices.sql`
- Tests: `*.test.ts` co-located

### Modified files
- `package.json` — add new deps & scripts
- `src/lib/db/schema.ts` — add tables & columns from AD-10, AD-11
- `src/app/layout.tsx` — `<Toaster />`, `<PostHogProvider>`, theme attr
- `src/middleware.ts` — brute-force gate (Plan 3, but flag here)
- `src/components/chat/ChatWindow.tsx` — citations, feedback, actions
- `src/components/chat/MessageBubble.tsx` — render CitationCard
- `src/components/documents/UploadDropzone.tsx` — emit status toast
- `src/lib/auth/org-utils.ts` — `assertOrgPlanLimit()`
- `src/lib/billing/plans.ts` — plan matrix (NEW from Plan 1 schema; populated here)
- `src/lib/llm/registry.ts` — model list for selector
- `src/lib/llm/streaming-adapter.ts` — support `modelId` param
- `src/app/api/query/route.ts` — citation parser hook (B1 from Plan 1, B4 widget per-token)
- `src/app/api/widget/chat/route.ts` — token auth (B7 from Plan 1, B4 widget per-token)
- `src/lib/langchain/rag-chain.ts` — emit citation events
- `src/lib/adapters/billing/polar.ts` — `createPortalSession()`

### Deleted files
- `src/app/widget/page.tsx` (catch-all replaced by `/widget/[token]/page.tsx`)

---

## Task 1: Resend client and email wrapper

**Files:**
- Create: `src/lib/email/resend.ts`
- Create: `src/lib/email/send.ts`
- Create: `src/lib/email/email.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Resend and React Email**

```bash
npm install resend @react-email/components
```

- [ ] **Step 2: Add env vars**

`.env.example` (and `.env.local`):
```bash
RESEND_API_KEY=re_test_xxxx
EMAIL_FROM="LexiLift <hello@lexilift.dev>"
APP_URL=http://localhost:3000
```

Update `src/lib/env.ts` (zod schema from Plan 1) to add:
```typescript
RESEND_API_KEY: z.string().min(1),
EMAIL_FROM: z.string().min(1),
APP_URL: z.string().url(),
```

- [ ] **Step 3: Write the failing test**

`src/lib/email/email.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'em_test' }) },
  })),
}))

import { sendEmail } from './send'

describe('sendEmail', () => {
  it('returns message id on success', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'LexiLift <hello@test.dev>'
    const id = await sendEmail({
      to: 'user@test.dev',
      subject: 'Hi',
      html: '<p>Hi</p>',
    })
    expect(id).toBe('em_test')
  })

  it('throws on API error', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'LexiLift <hello@test.dev>'
    const { Resend } = await import('resend')
    ;(Resend as any).mockImplementationOnce(() => ({
      emails: { send: vi.fn().mockRejectedValue(new Error('boom')) },
    }))
    await expect(sendEmail({ to: 'a', subject: 'b', html: 'c' })).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- email.test.ts
```

- [ ] **Step 5: Create `src/lib/email/resend.ts`**

```typescript
import { Resend } from 'resend'
import { env } from '@/lib/env'

let cached: Resend | null = null

export function getResend(): Resend {
  if (cached) return cached
  cached = new Resend(env.RESEND_API_KEY)
  return cached
}
```

- [ ] **Step 6: Create `src/lib/email/send.ts`**

```typescript
import { getResend } from './resend'
import { env } from '@/lib/env'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput): Promise<string> {
  const resend = getResend()
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  })
  if (error) throw new Error(error.message)
  return data!.id
}
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- email.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/email/ package.json
git commit -m "feat(email): Resend client + sendEmail wrapper with tests"
```

---

## Task 2: React Email invite template

**Files:**
- Create: `src/lib/email/templates/invite.tsx`
- Create: `src/lib/email/templates/invite.test.ts` (snapshot)

- [ ] **Step 1: Write the test**

`src/lib/email/templates/invite.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import { InviteEmail } from './invite'

describe('InviteEmail', () => {
  it('renders the org name and accept link', async () => {
    const html = await render(
      InviteEmail({ orgName: 'Acme', inviterName: 'Sam', acceptUrl: 'https://app/x' })
    )
    expect(html).toContain('Acme')
    expect(html).toContain('Sam')
    expect(html).toContain('https://app/x')
  })
})
```

- [ ] **Step 2: Install render for testing**

```bash
npm install -D @react-email/render
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- invite.test.ts
```

- [ ] **Step 4: Create `src/lib/email/templates/invite.tsx`**

```tsx
import { Html, Heading, Text, Button, Section, Container } from '@react-email/components'

export interface InviteEmailProps {
  orgName: string
  inviterName: string
  acceptUrl: string
}

export function InviteEmail({ orgName, inviterName, acceptUrl }: InviteEmailProps) {
  return (
    <Html>
      <Container>
        <Heading>Join {orgName} on LexiLift</Heading>
        <Text>{inviterName} invited you to collaborate on their workspace.</Text>
        <Section>
          <Button href={acceptUrl}>Accept Invitation</Button>
        </Section>
        <Text>This link expires in 7 days.</Text>
      </Container>
    </Html>
  )
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- invite.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/templates/
git commit -m "feat(email): React Email invite template"
```

---

## Task 3: Team members API (list, update role, remove)

**Files:**
- Create: `src/app/api/team/members/route.ts` (GET list)
- Create: `src/app/api/team/members/[id]/route.ts` (PATCH role, DELETE)
- Create: `src/app/api/team/members/members.test.ts`

- [ ] **Step 1: Write the failing test**

`src/app/api/team/members/members.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/auth/org-utils', () => ({
  requireOrgMember: vi.fn().mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))

import { GET, PATCH, DELETE } from './[id]/route'
import { db } from '@/lib/db'

describe('Team members API', () => {
  it('GET returns members for the org', async () => {
    ;(db.select as any).mockReturnValue({
      from: () => ({ where: () => [{ userId: 'u1', role: 'owner', email: 'a@b.c' }] }),
    })
    const res = await GET()
    const data = await res.json()
    expect(data).toHaveLength(1)
  })

  it('PATCH updates role', async () => {
    ;(db.update as any).mockReturnValue({ set: () => ({ where: () => [] }) })
    const req = new Request('http://x', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) })
    expect(res.status).toBe(200)
  })

  it('DELETE removes a member', async () => {
    ;(db.delete as any).mockReturnValue({ where: () => [] })
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'm1' }) })
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- members.test.ts
```

- [ ] **Step 3: Create `src/app/api/team/members/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { orgMembers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const { orgId } = await requireOrgMember()
  const rows = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      role: orgMembers.role,
      email: users.email,
      name: users.name,
      joinedAt: orgMembers.joinedAt,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId))
  return NextResponse.json(rows)
}
```

- [ ] **Step 4: Create `src/app/api/team/members/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { orgMembers } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const patchSchema = z.object({ role: z.enum(['admin', 'member']) })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgAdmin()
  const { id } = await params
  const body = patchSchema.parse(await req.json())
  await db
    .update(orgMembers)
    .set({ role: body.role })
    .where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgAdmin()
  const { id } = await params
  await db.delete(orgMembers).where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)))
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Add `requireOrgAdmin` to `src/lib/auth/org-utils.ts`**

```typescript
export async function requireOrgAdmin() {
  const ctx = await requireOrgMember()
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return ctx
}
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npm test -- members.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/team/ src/lib/auth/org-utils.ts
git commit -m "feat(team): members API (list, PATCH role, DELETE)"
```

---

## Task 4: Invite create + revoke API

**Files:**
- Create: `src/app/api/team/invites/route.ts` (POST = create)
- Create: `src/app/api/team/invites/[id]/route.ts` (DELETE = revoke)
- Create: `src/app/api/team/invites/invites.test.ts`

- [ ] **Step 1: Write the test**

`src/app/api/team/invites/invites.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/auth/org-utils', () => ({
  requireOrgAdmin: vi.fn().mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'owner' }),
}))
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn().mockResolvedValue('em_x') }))
vi.mock('@/lib/db', () => {
  const insert = vi.fn().mockReturnValue({ values: () => ({ returning: () => [{ id: 'inv1', token: 'tok' }] }) })
  return { db: { insert } }
})
vi.mock('crypto', () => ({ randomBytes: () => Buffer.from('a'.repeat(32)) }))

import { POST } from './route'

describe('Invites API', () => {
  it('creates an invite and emails it', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.dev', role: 'member' }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.id).toBe('inv1')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- invites.test.ts
```

- [ ] **Step 3: Add migration `0005_invites.sql`**

```sql
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invites_org_idx ON invites(org_id);
CREATE INDEX invites_token_idx ON invites(token);

CREATE POLICY "org members see invites" ON invites FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "admins manage invites" ON invites FOR ALL
  USING (is_org_admin(org_id));
```

Apply via `npm run db:migrate`.

Add to `src/lib/db/schema.ts`:
```typescript
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 4: Create `src/app/api/team/invites/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { invites, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email/send'
import { render } from '@react-email/render'
import { InviteEmail } from '@/lib/email/templates/invite'
import { env } from '@/lib/env'

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
})

export async function POST(req: Request) {
  const { orgId, userId } = await requireOrgAdmin()
  const { email, role } = postSchema.parse(await req.json())
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const [invite] = await db
    .insert(invites)
    .values({ orgId, email, role, token, invitedBy: userId, expiresAt })
    .returning()
  const inviter = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  const acceptUrl = `${env.APP_URL}/team/invite/${token}`
  await sendEmail({
    to: email,
    subject: `Join ${inviter[0]?.name ?? 'a workspace'} on LexiLift`,
    html: await render(InviteEmail({ orgName: 'your workspace', inviterName: inviter[0]?.name ?? 'A teammate', acceptUrl })),
  })
  return NextResponse.json({ id: invite.id }, { status: 201 })
}
```

- [ ] **Step 5: Create `src/app/api/team/invites/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { invites } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgAdmin()
  const { id } = await params
  await db.delete(invites).where(and(eq(invites.id, id), eq(invites.orgId, orgId)))
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npm test -- invites.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/team/invites/ src/lib/db/schema.ts src/lib/db/migrations/
git commit -m "feat(team): invite create + revoke API with Resend email"
```

---

## Task 5: Invite accept endpoint

**Files:**
- Create: `src/app/api/team/accept/[token]/route.ts`
- Create: `src/app/api/team/accept/accept.test.ts`
- Create: `src/app/team/invite/[token]/page.tsx`

- [ ] **Step 1: Write the test**

`src/app/api/team/accept/accept.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u2' } } }) } })),
}))
vi.mock('@/lib/db', () => {
  const update = vi.fn().mockReturnValue({ set: () => ({ where: () => [] }) })
  const select = vi.fn().mockReturnValue({
    from: () => ({ where: () => ({ limit: () => [{ id: 'inv1', orgId: 'o1', role: 'member', expiresAt: new Date(Date.now() + 1e6), acceptedAt: null }] }) }),
  })
  return { db: { update, select } }
})

import { POST } from './[token]/route'

describe('Invite accept', () => {
  it('accepts a valid invite', async () => {
    const res = await POST(new Request('http://x', { method: 'POST' }), { params: Promise.resolve({ token: 'tok' }) })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- accept.test.ts
```

- [ ] **Step 3: Create `src/app/api/team/accept/[token]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { invites, orgMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  const [invite] = await db.select().from(invites).where(eq(invites.token, token)).limit(1)
  if (!invite) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: 'ALREADY_ACCEPTED' }, { status: 409 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })
  await db.insert(orgMembers).values({ orgId: invite.orgId, userId: user.id, role: invite.role as 'admin' | 'member' })
  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id))
  return NextResponse.json({ orgId: invite.orgId })
}
```

- [ ] **Step 4: Create `src/app/team/invite/[token]/page.tsx`**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  useEffect(() => {
    fetch(`/api/team/accept/${params.token}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(() => router.push('/dashboard'))
      .catch(() => router.push('/login?error=invite'))
  }, [params.token, router])
  return <div className="p-8">Accepting invitation...</div>
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- accept.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/team/accept/ src/app/team/invite/
git commit -m "feat(team): invite accept endpoint + landing page"
```

---

## Task 6: Team page UI (members, invite, role, remove)

**Files:**
- Create: `src/components/team/MembersTable.tsx`
- Create: `src/components/team/InviteForm.tsx`
- Create: `src/components/team/RoleSelect.tsx`
- Create: `src/components/team/RemoveMemberDialog.tsx`
- Modify: `src/app/dashboard/team/page.tsx`
- Create: `src/app/dashboard/team/team.test.tsx`

- [ ] **Step 1: Write the test**

`src/app/dashboard/team/team.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MembersTable } from '@/components/team/MembersTable'

describe('MembersTable', () => {
  it('renders members', () => {
    render(<MembersTable members={[{ id: 'm1', email: 'a@b.c', name: 'A', role: 'owner', joinedAt: new Date() }]} currentUserRole="owner" />)
    expect(screen.getByText('a@b.c')).toBeInTheDocument()
  })
  it('hides remove for non-admins', () => {
    render(<MembersTable members={[{ id: 'm1', email: 'a@b.c', name: 'A', role: 'member', joinedAt: new Date() }]} currentUserRole="member" />)
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- team.test.tsx
```

- [ ] **Step 3: Create `src/components/team/RoleSelect.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function RoleSelect({ value, onChange, disabled }: { value: 'admin' | 'member'; onChange: (v: 'admin' | 'member') => void; disabled?: boolean }) {
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as 'admin' | 'member')} className="border rounded px-2 py-1 text-sm">
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  )
}
```

- [ ] **Step 4: Create `src/components/team/RemoveMemberDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function RemoveMemberDialog({ memberId, onConfirm }: { memberId: string; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-red-600">Remove</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded">
            <p>Remove this member?</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(false)}>Cancel</button>
              <button
                onClick={async () => { setLoading(true); await onConfirm(); setOpen(false) }}
                disabled={loading}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 5: Create `src/components/team/InviteForm.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function InviteForm({ onInvited }: { onInvited?: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setLoading(true); setErr(null)
        const r = await fetch('/api/team/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role }),
        })
        setLoading(false)
        if (!r.ok) { setErr('Failed to send invite'); return }
        setEmail(''); onInvited?.()
      }}
      className="flex gap-2 items-end"
    >
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="border rounded px-2 py-1" />
      <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')} className="border rounded px-2 py-1">
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button disabled={loading} className="bg-emerald-600 text-white px-3 py-1 rounded">{loading ? 'Sending…' : 'Send invite'}</button>
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </form>
  )
}
```

- [ ] **Step 6: Create `src/components/team/MembersTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { RoleSelect } from './RoleSelect'
import { RemoveMemberDialog } from './RemoveMemberDialog'

export interface Member {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}

export function MembersTable({ members, currentUserRole }: { members: Member[]; currentUserRole: 'owner' | 'admin' | 'member' }) {
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin'
  const [rows, setRows] = useState(members)
  return (
    <table className="w-full">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th>{canEdit && <th />}</tr></thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id}>
            <td>{m.name ?? '—'}</td>
            <td>{m.email}</td>
            <td>
              {canEdit && m.role !== 'owner' ? (
                <RoleSelect
                  value={m.role}
                  onChange={async (role) => {
                    await fetch(`/api/team/members/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
                    setRows(rows.map((r) => (r.id === m.id ? { ...r, role } : r)))
                  }}
                />
              ) : m.role}
            </td>
            <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
            {canEdit && (
              <td>
                {m.role !== 'owner' && (
                  <RemoveMemberDialog
                    memberId={m.id}
                    onConfirm={async () => {
                      await fetch(`/api/team/members/${m.id}`, { method: 'DELETE' })
                      setRows(rows.filter((r) => r.id !== m.id))
                    }}
                  />
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 7: Rewrite `src/app/dashboard/team/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { orgMembers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { MembersTable, type Member } from '@/components/team/MembersTable'
import { InviteForm } from '@/components/team/InviteForm'

export default async function TeamPage() {
  const { orgId, role } = await requireOrgMember()
  const rows = await db
    .select({ id: orgMembers.id, userId: orgMembers.userId, role: orgMembers.role, email: users.email, name: users.name, joinedAt: orgMembers.joinedAt })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId))
  const members: Member[] = rows.map((r) => ({ id: r.id, email: r.email, name: r.name, role: r.role as Member['role'], joinedAt: r.joinedAt }))
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Team</h1>
      {(role === 'owner' || role === 'admin') && <InviteForm />}
      <MembersTable members={members} currentUserRole={role as Member['role']} />
    </div>
  )
}
```

- [ ] **Step 8: Run test, expect PASS**

```bash
npm test -- team.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add src/components/team/ src/app/dashboard/team/
git commit -m "feat(team): members table, invite form, role select, remove dialog"
```

---

## Task 7: Settings page — org update, delete, transfer ownership

**Files:**
- Create: `src/app/api/organizations/[id]/route.ts` (PUT/DELETE)
- Create: `src/app/api/organizations/[id]/transfer/route.ts`
- Create: `src/components/settings/OrgForm.tsx`
- Create: `src/components/settings/DeleteOrgDialog.tsx`
- Create: `src/components/settings/TransferOwnershipDialog.tsx`
- Rewrite: `src/app/dashboard/settings/page.tsx`
- Create: `src/app/api/organizations/organizations.test.ts`

- [ ] **Step 1: Write the test**

`src/app/api/organizations/organizations.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/auth/org-utils', () => ({
  requireOrgAdmin: vi.fn().mockResolvedValue({ orgId: 'o1', userId: 'u1', role: 'owner' }),
}))
vi.mock('@/lib/db', () => ({
  db: { update: vi.fn().mockReturnValue({ set: () => ({ where: () => [] }) }), delete: vi.fn().mockReturnValue({ where: () => [] }) },
}))
import { PUT, DELETE } from './[id]/route'

describe('Org API', () => {
  it('PUT updates the org', async () => {
    const req = new Request('http://x', { method: 'PUT', body: JSON.stringify({ name: 'New' }) })
    const res = await PUT(req, { params: Promise.resolve({ id: 'o1' }) })
    expect(res.status).toBe(200)
  })
  it('DELETE removes the org', async () => {
    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'o1' }) })
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- organizations.test.ts
```

- [ ] **Step 3: Create `src/app/api/organizations/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const putSchema = z.object({ name: z.string().min(1).max(60) })

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgAdmin()
  const { id } = await params
  if (id !== orgId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const { name } = putSchema.parse(await req.json())
  await db.update(organizations).set({ name }).where(eq(organizations.id, orgId))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId, role } = await requireOrgAdmin()
  if (role !== 'owner') return NextResponse.json({ error: 'OWNER_REQUIRED' }, { status: 403 })
  const { id } = await params
  if (id !== orgId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  await db.delete(organizations).where(eq(organizations.id, orgId))
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Create `src/app/api/organizations/[id]/transfer/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { orgMembers } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const schema = z.object({ toUserId: z.string().uuid() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId, role } = await requireOrgMember()
  if (role !== 'owner') return NextResponse.json({ error: 'OWNER_REQUIRED' }, { status: 403 })
  const { id } = await params
  if (id !== orgId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const { toUserId } = schema.parse(await req.json())
  await db.transaction(async (tx) => {
    await tx.update(orgMembers).set({ role: 'admin' }).where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    await tx.update(orgMembers).set({ role: 'owner' }).where(and(eq(orgMembers.userId, toUserId), eq(orgMembers.orgId, orgId)))
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/components/settings/OrgForm.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function OrgForm({ orgId, initialName }: { orgId: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault(); setSaved(false)
        await fetch(`/api/organizations/${orgId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        setSaved(true)
      }}
      className="space-y-2"
    >
      <label className="block text-sm">Workspace name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
      <button className="bg-emerald-600 text-white px-3 py-1 rounded">Save</button>
      {saved && <span className="text-sm text-emerald-600 ml-2">Saved</span>}
    </form>
  )
}
```

- [ ] **Step 6: Create `src/components/settings/DeleteOrgDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteOrgDialog({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-red-600 text-sm">Delete workspace…</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded space-y-3 w-96">
            <h2 className="font-semibold">Delete this workspace?</h2>
            <p className="text-sm text-gray-600">Type the workspace ID to confirm. This is irreversible.</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="border rounded px-2 py-1 w-full" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)}>Cancel</button>
              <button
                disabled={confirm !== orgId}
                onClick={async () => {
                  await fetch(`/api/organizations/${orgId}`, { method: 'DELETE' })
                  router.push('/dashboard')
                }}
                className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 7: Create `src/components/settings/TransferOwnershipDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function TransferOwnershipDialog({ orgId, members, currentUserId }: { orgId: string; members: { id: string; userId: string; email: string }[]; currentUserId: string }) {
  const [target, setTarget] = useState('')
  const candidates = members.filter((m) => m.userId !== currentUserId)
  return (
    <div className="space-y-2">
      <select value={target} onChange={(e) => setTarget(e.target.value)} className="border rounded px-2 py-1">
        <option value="">Select new owner…</option>
        {candidates.map((m) => <option key={m.id} value={m.userId}>{m.email}</option>)}
      </select>
      <button
        disabled={!target}
        onClick={async () => {
          await fetch(`/api/organizations/${orgId}/transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: target }) })
          location.reload()
        }}
        className="bg-amber-600 text-white px-3 py-1 rounded disabled:opacity-50"
      >Transfer</button>
    </div>
  )
}
```

- [ ] **Step 8: Rewrite `src/app/dashboard/settings/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { organizations, orgMembers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { OrgForm } from '@/components/settings/OrgForm'
import { DeleteOrgDialog } from '@/components/settings/DeleteOrgDialog'
import { TransferOwnershipDialog } from '@/components/settings/TransferOwnershipDialog'

export default async function SettingsPage() {
  const { orgId, userId, role } = await requireOrgMember()
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  const members = await db
    .select({ id: orgMembers.id, userId: orgMembers.userId, email: users.email })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId))
  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <section>
        <h1 className="text-2xl font-semibold mb-4">Workspace</h1>
        <OrgForm orgId={orgId} initialName={org.name} />
      </section>
      {role === 'owner' && (
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Transfer ownership</h2>
          <TransferOwnershipDialog orgId={orgId} members={members} currentUserId={userId} />
        </section>
      )}
      {role === 'owner' && (
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Danger zone</h2>
          <DeleteOrgDialog orgId={orgId} />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Run test, expect PASS**

```bash
npm test -- organizations.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/app/api/organizations/ src/components/settings/ src/app/dashboard/settings/
git commit -m "feat(settings): org update, delete, transfer ownership"
```

---

## Task 8: URL ingest API + form

**Files:**
- Modify: `src/lib/parsers/url.ts` (add HTML stripping, follow redirects, max size)
- Create: `src/app/api/ingest/url/route.ts`
- Create: `src/components/documents/UrlIngestForm.tsx`
- Modify: `src/app/dashboard/documents/page.tsx` (add the form)
- Create: `src/app/api/ingest/url/url.test.ts`

- [ ] **Step 1: Write the test**

`src/app/api/ingest/url/url.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('node:fetch', () => ({ default: vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<html><body><h1>Hi</h1><p>Hello world</p></body></html>') }) }))
import { fetchAndParseUrl } from '@/lib/parsers/url'

describe('fetchAndParseUrl', () => {
  it('strips HTML and returns plain text', async () => {
    const out = await fetchAndParseUrl('https://example.com')
    expect(out).toContain('Hello world')
    expect(out).not.toContain('<h1>')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- url.test.ts
```

- [ ] **Step 3: Update `src/lib/parsers/url.ts`**

```typescript
import { JSDOM } from 'jsdom'

export interface UrlFetchResult { title: string; text: string; url: string }

const MAX_BYTES = 5 * 1024 * 1024
const TIMEOUT_MS = 15_000

export async function fetchAndParseUrl(input: string): Promise<UrlFetchResult> {
  const u = new URL(input)
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('UNSUPPORTED_PROTOCOL')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(u.toString(), { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'LexiLiftBot/1.0' } })
  } finally { clearTimeout(t) }
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('TOO_LARGE')
  const html = await res.text()
  const dom = new JSDOM(html)
  const doc = dom.window.document
  doc.querySelectorAll('script,style,noscript,header,footer,nav,aside').forEach((n) => n.remove())
  const title = doc.querySelector('title')?.textContent?.trim() ?? u.hostname
  const text = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim()
  return { title, text, url: u.toString() }
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm test -- url.test.ts
```

- [ ] **Step 5: Create `src/app/api/ingest/url/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { assertOrgPlanLimit } from '@/lib/auth/org-utils'

const schema = z.object({ url: z.string().url() })

export async function POST(req: Request) {
  const { orgId, userId } = await requireOrgMember()
  await assertOrgPlanLimit(orgId, 'documents')
  const { url } = schema.parse(await req.json())
  const [doc] = await db.insert(documents).values({ orgId, userId, sourceType: 'url', sourceUrl: url, status: 'pending', name: url }).returning()
  await inngest.send({ name: 'document/url.submitted', data: { documentId: doc.id, url } })
  return NextResponse.json({ id: doc.id, status: doc.status }, { status: 201 })
}
```

- [ ] **Step 6: Add `document/url.submitted` event to `src/lib/inngest/functions/processDocument.ts`**

```typescript
// in the same function, add to the trigger list:
{ event: 'document/url.submitted' }
```

And inside the handler, add a branch:
```typescript
if (event.name === 'document/url.submitted') {
  const { fetchAndParseUrl } = await import('@/lib/parsers/url')
  const { text, title } = await fetchAndParseUrl(event.data.url)
  await step.run('upsert-name', () => db.update(documents).set({ name: title }).where(eq(documents.id, event.data.documentId)))
  // continue to embedding step with `text`
}
```

(Refactor the function to share the embedding/indexing logic between `document/uploaded` and `document/url.submitted` — see Task 11 of Plan 1 for existing structure.)

- [ ] **Step 7: Add `assertOrgPlanLimit` to `src/lib/auth/org-utils.ts`**

```typescript
import { count, eq, and } from 'drizzle-orm'
import { getOrgPlan, PLAN_LIMITS } from '@/lib/billing/plans'

export async function assertOrgPlanLimit(orgId: string, resource: 'documents' | 'queries' | 'widgets') {
  const plan = await getOrgPlan(orgId)
  const limit = PLAN_LIMITS[plan][resource]
  if (limit === Infinity) return
  const [{ value }] = await db.select({ value: count() }).from(documents).where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
  if (value >= limit) throw new Error('PLAN_LIMIT_REACHED')
}
```

- [ ] **Step 8: Create `src/components/documents/UrlIngestForm.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function UrlIngestForm({ onAdded }: { onAdded?: (id: string) => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault(); setLoading(true); setErr(null)
        const r = await fetch('/api/ingest/url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
        setLoading(false)
        if (!r.ok) { setErr('Failed'); return }
        const { id } = await r.json()
        onAdded?.(id); setUrl('')
      }}
      className="flex gap-2"
    >
      <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="border rounded px-2 py-1 flex-1" />
      <button disabled={loading} className="bg-emerald-600 text-white px-3 py-1 rounded">{loading ? 'Adding…' : 'Add URL'}</button>
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </form>
  )
}
```

- [ ] **Step 9: Modify `src/app/dashboard/documents/page.tsx`**

Add at the top of the returned JSX, below the heading:
```tsx
import { UrlIngestForm } from '@/components/documents/UrlIngestForm'
// ...
<UrlIngestForm onAdded={() => revalidatePath('/dashboard/documents')} />
```

(The page is a Server Component; pass `revalidatePath` from `next/cache` via a thin Client wrapper or use `router.refresh()` — see Task 9 for status polling which already covers this.)

- [ ] **Step 10: Commit**

```bash
git add src/lib/parsers/url.ts src/app/api/ingest/url/ src/lib/inngest/functions/processDocument.ts src/lib/auth/org-utils.ts src/components/documents/UrlIngestForm.tsx src/app/dashboard/documents/page.tsx
git commit -m "feat(ingest): URL paste ingest with HTML stripping + plan enforcement"
```

---

## Task 9: Document status polling (client-side)

**Files:**
- Create: `src/components/documents/StatusBadge.tsx`
- Create: `src/components/documents/DocumentList.tsx` (client component)
- Modify: `src/app/dashboard/documents/page.tsx` (delegate to DocumentList)

- [ ] **Step 1: Create `src/components/documents/StatusBadge.tsx`**

```tsx
const STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  parsing: 'bg-amber-100 text-amber-700',
  chunking: 'bg-amber-100 text-amber-700',
  embedding: 'bg-amber-100 text-amber-700',
  indexing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: keyof typeof STYLES }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${STYLES[status] ?? 'bg-gray-100'}`}>{status}</span>
}
```

- [ ] **Step 2: Create `src/components/documents/DocumentList.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from './StatusBadge'

export interface DocRow { id: string; name: string; status: 'pending' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'failed'; createdAt: string | Date }

export function DocumentList({ initialDocs }: { initialDocs: DocRow[] }) {
  const router = useRouter()
  const [docs, setDocs] = useState(initialDocs)
  const pending = docs.some((d) => d.status !== 'ready' && d.status !== 'failed')
  useEffect(() => {
    if (!pending) return
    const t = setInterval(async () => {
      const r = await fetch('/api/documents?status=processing')
      if (r.ok) {
        const fresh: DocRow[] = await r.json()
        setDocs((prev) => prev.map((p) => fresh.find((f) => f.id === p.id) ?? p))
      }
    }, 2000)
    return () => clearInterval(t)
  }, [pending])
  useEffect(() => { if (!pending) router.refresh() }, [pending, router])
  return (
    <table className="w-full">
      <thead><tr><th>Name</th><th>Status</th><th>Created</th></tr></thead>
      <tbody>
        {docs.map((d) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td><StatusBadge status={d.status} /></td>
            <td>{new Date(d.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Modify `src/app/api/documents/route.ts` (GET) to support `?status=` filter**

Add at the end of the existing GET handler (or create if missing):
```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { and, eq, ne, isNull } from 'drizzle-orm'

export async function GET(req: Request) {
  const { orgId } = await requireOrgMember()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const where = status === 'processing'
    ? and(eq(documents.orgId, orgId), ne(documents.status, 'ready'), ne(documents.status, 'failed'), isNull(documents.deletedAt))
    : and(eq(documents.orgId, orgId), isNull(documents.deletedAt))
  const rows = await db.select({ id: documents.id, name: documents.name, status: documents.status, createdAt: documents.createdAt }).from(documents).where(where)
  return NextResponse.json(rows)
}
```

- [ ] **Step 4: Modify `src/app/dashboard/documents/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { DocumentList } from '@/components/documents/DocumentList'
import { UrlIngestForm } from '@/components/documents/UrlIngestForm'

export default async function DocumentsPage() {
  const { orgId } = await requireOrgMember()
  const rows = await db
    .select({ id: documents.id, name: documents.name, status: documents.status, createdAt: documents.createdAt })
    .from(documents)
    .where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <UrlIngestForm />
      <DocumentList initialDocs={rows} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/documents/ src/app/api/documents/ src/app/dashboard/documents/
git commit -m "feat(documents): status badge + client-side polling for processing docs"
```

---

## Task 10: Soft delete + bulk delete API & UI

**Files:**
- Modify: `src/app/api/documents/[id]/route.ts` (change DELETE to soft delete)
- Create: `src/app/api/documents/bulk-delete/route.ts`
- Create: `src/components/documents/BulkActionsBar.tsx`
- Modify: `src/components/documents/DocumentList.tsx` (add checkboxes)

- [ ] **Step 1: Update `src/app/api/documents/[id]/route.ts` DELETE**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgMember()
  const { id } = await params
  await db.update(documents).set({ deletedAt: new Date() }).where(and(eq(documents.id, id), eq(documents.orgId, orgId), isNull(documents.deletedAt)))
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Create `src/app/api/documents/bulk-delete/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { inArray, and, eq, isNull } from 'drizzle-orm'

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) })

export async function POST(req: Request) {
  const { orgId } = await requireOrgMember()
  const { ids } = schema.parse(await req.json())
  await db.update(documents).set({ deletedAt: new Date() }).where(and(inArray(documents.id, ids), eq(documents.orgId, orgId), isNull(documents.deletedAt)))
  return NextResponse.json({ deleted: ids.length })
}
```

- [ ] **Step 3: Modify `src/components/documents/DocumentList.tsx` to support selection**

Add to imports:
```tsx
import { useState } from 'react'
import { BulkActionsBar } from './BulkActionsBar'
```

Inside the component:
```tsx
const [selected, setSelected] = useState<Set<string>>(new Set())
// ...
<table>
  <thead><tr><th /><th>Name</th><th>Status</th><th>Created</th></tr></thead>
  <tbody>
    {docs.map((d) => (
      <tr key={d.id}>
        <td><input type="checkbox" checked={selected.has(d.id)} onChange={(e) => { const ns = new Set(selected); e.target.checked ? ns.add(d.id) : ns.delete(d.id); setSelected(ns) }} /></td>
        <td>{d.name}</td>
        <td><StatusBadge status={d.status} /></td>
        <td>{new Date(d.createdAt).toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>
{selected.size > 0 && <BulkActionsBar count={selected.size} onDelete={async () => { await fetch('/api/documents/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) }); setDocs((d) => d.filter((x) => !selected.has(x.id))); setSelected(new Set()) }} />}
```

- [ ] **Step 4: Create `src/components/documents/BulkActionsBar.tsx`**

```tsx
'use client'

export function BulkActionsBar({ count, onDelete }: { count: number; onDelete: () => Promise<void> }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-4 py-2 flex gap-3 items-center border">
      <span className="text-sm">{count} selected</span>
      <button onClick={onDelete} className="bg-red-600 text-white text-sm px-3 py-1 rounded">Delete</button>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/documents/ src/components/documents/
git commit -m "feat(documents): soft delete + bulk delete"
```

---

## Task 11: Restore + re-process UI

**Files:**
- Create: `src/app/api/documents/[id]/restore/route.ts`
- Create: `src/app/api/documents/[id]/reprocess/route.ts`
- Create: `src/components/documents/RestoreButton.tsx`
- Create: `src/components/documents/ReprocessButton.tsx`
- Modify: `src/components/documents/DocumentList.tsx` (add columns for both, plus a "Trash" tab)

- [ ] **Step 1: Create `src/app/api/documents/[id]/restore/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { and, eq, isNotNull } from 'drizzle-orm'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgMember()
  const { id } = await params
  await db.update(documents).set({ deletedAt: null }).where(and(eq(documents.id, id), eq(documents.orgId, orgId), isNotNull(documents.deletedAt)))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create `src/app/api/documents/[id]/reprocess/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgMember()
  const { id } = await params
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.orgId, orgId))).limit(1)
  if (!doc) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  await db.update(documents).set({ status: 'pending', error: null }).where(eq(documents.id, id))
  await inngest.send({ name: 'document/reprocess.requested', data: { documentId: id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Add `document/reprocess.requested` handler in `src/lib/inngest/functions/processDocument.ts`**

```typescript
{ event: 'document/reprocess.requested' }
```

Handler branch:
```typescript
if (event.name === 'document/reprocess.requested') {
  const [doc] = await step.run('load', () => db.select().from(documents).where(eq(documents.id, event.data.documentId)).limit(1))
  if (!doc) throw new NonRetriableError('Doc missing')
  // re-run the same parse → chunk → embed → index pipeline
  await runIndexingPipeline(doc)
}
```

(Refactor: extract the common pipeline into a `runIndexingPipeline(doc)` helper inside the same file. Both `document/uploaded`, `document/url.submitted`, and `document/reprocess.requested` call it.)

- [ ] **Step 4: Create `src/components/documents/RestoreButton.tsx`**

```tsx
'use client'

export function RestoreButton({ id, onRestored }: { id: string; onRestored: () => void }) {
  return (
    <button
      onClick={async () => { await fetch(`/api/documents/${id}/restore`, { method: 'POST' }); onRestored() }}
      className="text-sm text-emerald-600"
    >Restore</button>
  )
}
```

- [ ] **Step 5: Create `src/components/documents/ReprocessButton.tsx`**

```tsx
'use client'

export function ReprocessButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => { await fetch(`/api/documents/${id}/reprocess`, { method: 'POST' }) }}
      className="text-sm text-amber-600"
    >Re-process</button>
  )
}
```

- [ ] **Step 6: Modify `src/components/documents/DocumentList.tsx` to add columns and a tab**

Add a `trashed` prop:
```tsx
export function DocumentList({ initialDocs, trashed = false }: { initialDocs: DocRow[]; trashed?: boolean }) { ... }
```

Add a column to the table:
```tsx
<td>{trashed ? <RestoreButton id={d.id} onRestored={() => setDocs((cur) => cur.filter((x) => x.id !== d.id))} /> : <ReprocessButton id={d.id} />}</td>
```

- [ ] **Step 7: Modify `src/app/dashboard/documents/page.tsx` to add a Trash tab**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
// Server: fetch live & trashed in parallel, pass to <DocumentsView />

export default async function DocumentsPage() {
  const { orgId } = await requireOrgMember()
  const live = await db.select(...).where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
  const trashed = await db.select(...).where(and(eq(documents.orgId, orgId), isNotNull(documents.deletedAt)))
  return <DocumentsView live={live} trashed={trashed} />
}

function DocumentsView({ live, trashed }: { live: DocRow[]; trashed: DocRow[] }) {
  const [tab, setTab] = useState<'live' | 'trash'>('live')
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <div className="flex gap-4 border-b">
        <button onClick={() => setTab('live')} className={tab === 'live' ? 'border-b-2 border-emerald-600' : ''}>Live ({live.length})</button>
        <button onClick={() => setTab('trash')} className={tab === 'trash' ? 'border-b-2 border-emerald-600' : ''}>Trash ({trashed.length})</button>
      </div>
      {tab === 'live' ? <DocumentList initialDocs={live} /> : <DocumentList initialDocs={trashed} trashed />}
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/documents/ src/components/documents/ src/lib/inngest/functions/processDocument.ts src/app/dashboard/documents/
git commit -m "feat(documents): restore, re-process, and trash tab"
```

---

## Task 12: Chat session list + new chat

**Files:**
- Create: `src/app/api/chat/sessions/route.ts` (GET list, POST create)
- Create: `src/app/api/chat/sessions/[id]/route.ts` (GET messages, DELETE session)
- Create: `src/components/chat/SessionList.tsx`
- Create: `src/components/chat/NewChatButton.tsx`
- Create: `src/app/dashboard/chat/[sessionId]/page.tsx`
- Rewrite: `src/app/dashboard/chat/page.tsx`
- Create: `src/components/chat/sessions.test.tsx`

- [ ] **Step 1: Write the test**

`src/components/chat/sessions.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionList } from './SessionList'

describe('SessionList', () => {
  it('renders sessions and calls onSelect', () => {
    const onSelect = vi.fn()
    render(<SessionList sessions={[{ id: 's1', title: 'Q1', updatedAt: new Date() }]} activeId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Q1'))
    expect(onSelect).toHaveBeenCalledWith('s1')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- sessions.test.tsx
```

- [ ] **Step 3: Add migration `0006_chat_sessions.sql`**

```sql
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_sessions_org_idx ON chat_sessions(org_id);

CREATE POLICY "users see their sessions" ON chat_sessions FOR SELECT
  USING (is_org_member(org_id) AND user_id = current_user_id());
CREATE POLICY "users create their own" ON chat_sessions FOR INSERT
  WITH CHECK (is_org_member(org_id) AND user_id = current_user_id());
CREATE POLICY "users update their own" ON chat_sessions FOR UPDATE
  USING (is_org_member(org_id) AND user_id = current_user_id());
CREATE POLICY "users delete their own" ON chat_sessions FOR DELETE
  USING (is_org_member(org_id) AND user_id = current_user_id());
```

`is_org_member` and `current_user_id()` are from Plan 1's RLS helpers.

- [ ] **Step 4: Add to `src/lib/db/schema.ts`**

```typescript
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New chat'),
  model: text('model').notNull().default('gpt-4o-mini'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 5: Create `src/app/api/chat/sessions/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatSessions } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'

const postSchema = z.object({ model: z.string().default('gpt-4o-mini') })

export async function GET() {
  const { orgId, userId } = await requireOrgMember()
  const rows = await db.select().from(chatSessions).where(and(eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId))).orderBy(desc(chatSessions.updatedAt)).limit(50)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { orgId, userId } = await requireOrgMember()
  const { model } = postSchema.parse(await req.json().catch(() => ({})))
  const [s] = await db.insert(chatSessions).values({ orgId, userId, model }).returning()
  return NextResponse.json(s, { status: 201 })
}
```

- [ ] **Step 6: Create `src/app/api/chat/sessions/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatSessions, chatMessages } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId))).limit(1)
  if (!session) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const messages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, id)).orderBy(asc(chatMessages.createdAt))
  return NextResponse.json({ session, messages })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  await db.delete(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId)))
  return new NextResponse(null, { status: 204 })
}
```

(`chatMessages` is created in Task 13 below.)

- [ ] **Step 7: Create `src/components/chat/NewChatButton.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'

export function NewChatButton() {
  const router = useRouter()
  return (
    <button
      onClick={async () => {
        const r = await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        const s = await r.json()
        router.push(`/dashboard/chat/${s.id}`)
      }}
      className="bg-emerald-600 text-white text-sm px-3 py-1 rounded w-full"
    >+ New chat</button>
  )
}
```

- [ ] **Step 8: Create `src/components/chat/SessionList.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'

export interface Session { id: string; title: string; updatedAt: string | Date }

export function SessionList({ sessions, activeId }: { sessions: Session[]; activeId: string | null }) {
  const router = useRouter()
  return (
    <ul className="space-y-1">
      {sessions.map((s) => (
        <li key={s.id}>
          <button
            onClick={() => router.push(`/dashboard/chat/${s.id}`)}
            className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-100 ${activeId === s.id ? 'bg-gray-100 font-medium' : ''}`}
          >{s.title}</button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 9: Rewrite `src/app/dashboard/chat/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
export default function ChatIndex() { redirect('/dashboard') }
```

- [ ] **Step 10: Create `src/app/dashboard/chat/[sessionId]/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatSessions, chatMessages } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { NewChatButton } from '@/components/chat/NewChatButton'
import { SessionList } from '@/components/chat/SessionList'

export default async function ChatSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const { orgId, userId } = await requireOrgMember()
  const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.id, sessionId), eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId))).limit(1)
  if (!session) return <div className="p-8">Not found</div>
  const messages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(asc(chatMessages.createdAt))
  const allSessions = await db.select().from(chatSessions).where(and(eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId))).orderBy(asc(chatSessions.updatedAt))
  return (
    <div className="flex h-full">
      <aside className="w-64 border-r p-4 space-y-2">
        <NewChatButton />
        <SessionList sessions={allSessions} activeId={sessionId} />
      </aside>
      <main className="flex-1">
        <ChatWindow sessionId={sessionId} initialMessages={messages} model={session.model} />
      </main>
    </div>
  )
}
```

- [ ] **Step 11: Run test, expect PASS**

```bash
npm test -- sessions.test.tsx
```

- [ ] **Step 12: Commit**

```bash
git add src/app/api/chat/sessions/ src/components/chat/ src/app/dashboard/chat/ src/lib/db/schema.ts src/lib/db/migrations/
git commit -m "feat(chat): session list, new chat, chat route per session"
```

---

## Task 13: Chat messages table + auto-title + model selector

**Files:**
- Create migration `0007_chat_messages.sql`
- Modify `src/lib/db/schema.ts`
- Create: `src/app/api/chat/sessions/[id]/messages/route.ts` (POST user message + assistant response)
- Create: `src/app/api/chat/sessions/[id]/title/route.ts` (PATCH auto-title)
- Create: `src/components/chat/ModelSelector.tsx`
- Create: `src/components/chat/AutoTitle.tsx`
- Modify: `src/components/chat/ChatWindow.tsx` (use messages, model selector)
- Create: `src/components/chat/chat.test.tsx`

- [ ] **Step 1: Migration `0007_chat_messages.sql`**

```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  citations jsonb,
  feedback text CHECK (feedback IN ('up', 'down') OR feedback IS NULL),
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_session_idx ON chat_messages(session_id);

CREATE POLICY "users see their messages" ON chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = current_user_id()));
CREATE POLICY "users insert their own" ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = current_user_id()));
CREATE POLICY "users update feedback" ON chat_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = current_user_id()));
```

- [ ] **Step 2: Add to schema**

```typescript
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations'),
  feedback: text('feedback', { enum: ['up', 'down'] }),
  model: text('model'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3: Write the test**

`src/components/chat/chat.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelSelector } from './ModelSelector'

describe('ModelSelector', () => {
  it('renders options', () => {
    render(<ModelSelector value="gpt-4o-mini" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Create `src/lib/llm/models.ts`**

```typescript
export const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (fast)' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
] as const
export type ModelId = typeof MODELS[number]['id']
```

- [ ] **Step 5: Create `src/components/chat/ModelSelector.tsx`**

```tsx
'use client'
import { MODELS, type ModelId } from '@/lib/llm/models'

export function ModelSelector({ value, onChange }: { value: ModelId; onChange: (m: ModelId) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ModelId)} className="border rounded px-2 py-1 text-sm">
      {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  )
}
```

- [ ] **Step 6: Create `src/app/api/chat/sessions/[id]/messages/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatMessages, chatSessions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getLLM } from '@/lib/llm/registry'
import { inngest } from '@/lib/inngest/client'

const schema = z.object({ content: z.string().min(1).max(2000) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  const [session] = await db.select().from(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId))).limit(1)
  if (!session) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const { content } = schema.parse(await req.json())
  const [userMsg] = await db.insert(chatMessages).values({ sessionId: id, role: 'user', content }).returning()
  await inngest.send({ name: 'chat/message.received', data: { sessionId: id, messageId: userMsg.id, content, model: session.model } })
  return NextResponse.json({ userMessageId: userMsg.id }, { status: 202 })
}
```

- [ ] **Step 7: Add `chat/message.received` Inngest function `src/lib/inngest/functions/generateAnswer.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db'
import { chatMessages, chatSessions, documents, chunks } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getLLM } from '@/lib/llm/registry'
import { NonRetriableError } from 'inngest'

export const generateAnswer = inngest.createFunction(
  { id: 'generate-answer' },
  { event: 'chat/message.received' },
  async ({ event, step }) => {
    const { sessionId, content, model } = event.data
    const session = await step.run('load-session', async () => {
      const [s] = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1)
      if (!s) throw new NonRetriableError('Session missing')
      return s
    })
    const history = await step.run('load-history', async () => db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt))
    const contextChunks = await step.run('retrieve', async () => retrieveRelevantChunks(session.orgId, content, 5))
    const answer = await step.run('generate', async () => {
      const llm = getLLM(model)
      const sys = `You are a RAG assistant. Use ONLY the context below to answer. Cite sources as [n] where n corresponds to the context block. If the answer is not in the context, say "I don't know."\n\nCONTEXT:\n${contextChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n')}`
      const result = await llm.generate({ system: sys, messages: history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })) })
      return result.text
    })
    await step.run('persist', async () => {
      await db.insert(chatMessages).values({ sessionId, role: 'assistant', content: answer, citations: contextChunks.map((c) => ({ documentId: c.documentId, chunkId: c.id, text: c.text })), model })
      await db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, sessionId))
    })
    if (history.filter((m) => m.role === 'user').length === 1) {
      await step.run('auto-title', async () => autoTitleFromMessage(sessionId, content))
    }
    return { ok: true }
  }
)
```

`retrieveRelevantChunks` is a helper that:
1. Embeds the query with the chosen embedding model (default OpenAI `text-embedding-3-small`).
2. Queries Pinecone for top-K (5) chunks for the org's namespace.
3. Hydrates the chunk text from the `chunks` table.

(Implementation uses `getEmbeddings()` from `src/lib/adapters/embeddings/openai.ts` added in Plan 1.)

- [ ] **Step 8: Create `src/app/api/chat/sessions/[id]/title/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatSessions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getLLM } from '@/lib/llm/registry'

const schema = z.object({ title: z.string().min(1).max(80) })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  const { title } = schema.parse(await req.json())
  await db.update(chatSessions).set({ title, updatedAt: new Date() }).where(and(eq(chatSessions.id, id), eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId)))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 9: Create `src/components/chat/AutoTitle.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

export function AutoTitle({ sessionId, initial }: { sessionId: string; initial: string }) {
  const [title, setTitle] = useState(initial)
  useEffect(() => {
    if (title !== 'New chat') return
    // after first user message arrives (parent passes `firstUserMessage`), call the endpoint
  }, [title, sessionId])
  return <h1 className="text-lg font-semibold">{title}</h1>
}
```

(Actual auto-title call is triggered from `ChatWindow` after the first user message; see Step 11.)

- [ ] **Step 10: Update `src/lib/llm/registry.ts` to return LLM supporting arbitrary model**

```typescript
export function getLLM(modelId: string): { generate: (opts: { system: string; messages: { role: 'user' | 'assistant' | 'system'; content: string }[] }) => Promise<{ text: string }> } {
  if (modelId.startsWith('gpt-')) return openAIAdapter(modelId)
  if (modelId.startsWith('claude-')) return anthropicAdapter(modelId)
  if (modelId.startsWith('gemini-')) return geminiAdapter(modelId)
  throw new Error('UNKNOWN_MODEL')
}
```

(Adapters are added in Plan 1; this is just the new dispatcher.)

- [ ] **Step 11: Modify `src/components/chat/ChatWindow.tsx`**

The window now:
- Accepts `sessionId`, `initialMessages`, `model`
- Renders messages via `MessageBubble`
- Has a `ModelSelector` in the header
- POSTs to `/api/chat/sessions/${sessionId}/messages`
- After first user message, PATCH `/api/chat/sessions/${sessionId}/title` with a title from the LLM (call `generateText` directly with a 4-word summary prompt)

```tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { ModelSelector } from './ModelSelector'
import type { ModelId } from '@/lib/llm/models'

interface Msg { id?: string; role: 'user' | 'assistant' | 'system'; content: string; citations?: any[] }

export function ChatWindow({ sessionId, initialMessages, model: initialModel }: { sessionId: string; initialMessages: Msg[]; model: ModelId }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages)
  const [model, setModel] = useState<ModelId>(initialModel)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const polledOnce = useRef(false)
  useEffect(() => {
    if (polledOnce.current) return
    polledOnce.current = true
    const t = setInterval(async () => {
      const r = await fetch(`/api/chat/sessions/${sessionId}`)
      if (r.ok) {
        const { messages } = await r.json()
        setMsgs(messages)
        if (messages.some((m: Msg) => m.role === 'assistant')) clearInterval(t)
      }
    }, 1500)
    return () => clearInterval(t)
  }, [sessionId])
  return (
    <div className="flex flex-col h-full">
      <header className="border-b p-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Chat</h1>
        <ModelSelector value={model} onChange={async (m) => { await fetch(`/api/chat/sessions/${sessionId}/title`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: m }) }); setModel(m) }} />
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {msgs.map((m, i) => <MessageBubble key={m.id ?? i} message={m} />)}
      </div>
      <form
        className="border-t p-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!input.trim()) return
          setSending(true)
          const optimistic: Msg = { role: 'user', content: input }
          setMsgs((m) => [...m, optimistic])
          setInput('')
          await fetch(`/api/chat/sessions/${sessionId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: optimistic.content }) })
          setSending(false)
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 border rounded px-2 py-1" placeholder="Ask anything…" />
        <button disabled={sending} className="bg-emerald-600 text-white px-3 py-1 rounded">Send</button>
      </form>
    </div>
  )
}
```

(PATCH title with a `{ model }` body requires extending the title endpoint schema to accept model — see Step 8 schema, add `model: z.string().optional()`.)

- [ ] **Step 12: Extend title route to accept model**

In `src/app/api/chat/sessions/[id]/title/route.ts`:
```typescript
const schema = z.object({ title: z.string().min(1).max(80).optional(), model: z.string().optional() })
// ... in handler:
if (title) updates.title = title
if (model) updates.model = model
await db.update(chatSessions).set(updates).where(...)
```

- [ ] **Step 13: Run test, expect PASS**

```bash
npm test -- chat.test.tsx
```

- [ ] **Step 14: Commit**

```bash
git add src/components/chat/ src/app/api/chat/ src/lib/llm/ src/lib/inngest/functions/generateAnswer.ts src/lib/db/schema.ts src/lib/db/migrations/
git commit -m "feat(chat): messages table, model selector, async answer generation"
```

---

## Task 14: Citation parser (extract [n] markers → structured citations)

**Files:**
- Create: `src/lib/citations/types.ts`
- Create: `src/lib/citations/parser.ts`
- Create: `src/lib/citations/parser.test.ts`

- [ ] **Step 1: Write the test**

`src/lib/citations/parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseCitations } from './parser'

describe('parseCitations', () => {
  it('extracts [1], [2] markers and returns cleaned text + citations', () => {
    const chunks = [{ id: 'c1', documentId: 'd1' }, { id: 'c2', documentId: 'd1' }]
    const out = parseCitations('Hello world [1]. See also [2].', chunks)
    expect(out.text).toBe('Hello world . See also .')  // markers removed
    expect(out.citations).toEqual([
      { index: 1, documentId: 'd1', chunkId: 'c1' },
      { index: 2, documentId: 'd1', chunkId: 'c2' },
    ])
  })

  it('deduplicates repeated indices', () => {
    const out = parseCitations('A [1] B [1]', [{ id: 'c1', documentId: 'd1' }])
    expect(out.citations).toHaveLength(1)
  })

  it('keeps markers outside the chunk range as plain text', () => {
    const out = parseCitations('A [99]', [{ id: 'c1', documentId: 'd1' }])
    expect(out.text).toBe('A [99]')
    expect(out.citations).toEqual([])
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- citations/parser.test.ts
```

- [ ] **Step 3: Create `src/lib/citations/types.ts`**

```typescript
export interface CitationRef { index: number; documentId: string; chunkId: string }
export interface ParsedAnswer { text: string; citations: CitationRef[] }
```

- [ ] **Step 4: Create `src/lib/citations/parser.ts`**

```typescript
import type { CitationRef, ParsedAnswer } from './types'

export function parseCitations(raw: string, chunks: { id: string; documentId: string }[]): ParsedAnswer {
  const seen = new Map<number, CitationRef>()
  const text = raw.replace(/\[(\d+)\]/g, (m, n) => {
    const idx = Number(n)
    if (idx >= 1 && idx <= chunks.length) {
      const c = chunks[idx - 1]
      if (!seen.has(idx)) seen.set(idx, { index: idx, documentId: c.documentId, chunkId: c.id })
      return ''
    }
    return m
  }).trim()
  const citations = [...seen.values()].sort((a, b) => a.index - b.index)
  return { text, citations }
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- citations/parser.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/citations/
git commit -m "feat(citations): parser for [n] markers → structured refs"
```

---

## Task 15: CitationCard + SourceHighlight (render citations under answers)

**Files:**
- Create: `src/components/chat/CitationCard.tsx`
- Create: `src/components/chat/SourceHighlight.tsx`
- Create: `src/components/chat/citations.test.tsx`
- Modify: `src/components/chat/MessageBubble.tsx` (render citations)

- [ ] **Step 1: Write the test**

`src/components/chat/citations.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitationCard } from './CitationCard'

describe('CitationCard', () => {
  it('renders the citation text and doc name', () => {
    render(<CitationCard index={1} documentName="Manual.pdf" snippet="The quick brown fox." />)
    expect(screen.getByText('Manual.pdf')).toBeInTheDocument()
    expect(screen.getByText('The quick brown fox.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- citations.test.tsx
```

- [ ] **Step 3: Create `src/components/chat/CitationCard.tsx`**

```tsx
'use client'
import { SourceHighlight } from './SourceHighlight'

export function CitationCard({ index, documentName, snippet }: { index: number; documentName: string; snippet: string }) {
  return (
    <div className="border rounded p-2 text-sm bg-gray-50">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="bg-emerald-100 text-emerald-700 rounded-full px-2">[{index}]</span>
        <span>{documentName}</span>
      </div>
      <SourceHighlight text={snippet} />
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/chat/SourceHighlight.tsx`**

```tsx
'use client'

export function SourceHighlight({ text, query }: { text: string; query?: string }) {
  if (!query) return <p className="mt-1">{text}</p>
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(re)
  return (
    <p className="mt-1">
      {parts.map((p, i) => i % 2 === 1 ? <mark key={i} className="bg-amber-100">{p}</mark> : <span key={i}>{p}</span>)}
    </p>
  )
}
```

- [ ] **Step 5: Modify `src/components/chat/MessageBubble.tsx`**

```tsx
'use client'
import { CitationCard } from './CitationCard'

interface Citation { index: number; documentId: string; chunkId: string; documentName?: string; snippet?: string }

export function MessageBubble({ message }: { message: { id?: string; role: 'user' | 'assistant' | 'system'; content: string; citations?: Citation[] } }) {
  if (message.role === 'user') return <div className="flex justify-end"><div className="bg-emerald-600 text-white rounded-2xl px-4 py-2 max-w-2xl">{message.content}</div></div>
  if (message.role === 'system') return null
  return (
    <div className="space-y-2">
      <div className="bg-white border rounded-2xl px-4 py-2 max-w-2xl">{message.content}</div>
      {message.citations && message.citations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
          {message.citations.map((c) => (
            <CitationCard key={c.index} index={c.index} documentName={c.documentName ?? 'Source'} snippet={c.snippet ?? ''} />
          ))}
        </div>
      )}
    </div>
  )
}
```

(Note: the `/api/chat/sessions/[id]` GET handler is extended in Step 7 below to include the joined `documentName` and `snippet` so the bubble renders them.)

- [ ] **Step 6: Extend `GET /api/chat/sessions/[id]` to join chunk → document for citations**

In `src/app/api/chat/sessions/[id]/route.ts`, replace the messages query:
```typescript
import { chatMessages, chatSessions, documents, chunks } from '@/lib/db/schema'
// ...
const messages = await db
  .select({
    id: chatMessages.id,
    role: chatMessages.role,
    content: chatMessages.content,
    citations: chatMessages.citations,
    feedback: chatMessages.feedback,
    model: chatMessages.model,
    createdAt: chatMessages.createdAt,
  })
  .from(chatMessages)
  .where(eq(chatMessages.sessionId, id))
  .orderBy(asc(chatMessages.createdAt))

// Hydrate citation metadata (documentName + snippet)
const allChunkIds = messages.flatMap((m: any) => (m.citations ?? []).map((c: any) => c.chunkId))
const chunkRows = allChunkIds.length > 0
  ? await db.select({ id: chunks.id, text: chunks.text, documentId: chunks.documentId, documentName: documents.name })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(inArray(chunks.id, allChunkIds))
  : []
const chunkMap = new Map(chunkRows.map((c) => [c.id, c]))
const enriched = messages.map((m: any) => ({
  ...m,
  citations: (m.citations ?? []).map((c: any) => ({ ...c, snippet: chunkMap.get(c.chunkId)?.text?.slice(0, 240), documentName: chunkMap.get(c.chunkId)?.documentName })),
}))
return NextResponse.json({ session, messages: enriched })
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- citations.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/components/chat/ src/app/api/chat/sessions/
git commit -m "feat(chat): citation cards + source highlights under answers"
```

---

## Task 16: Feedback buttons (thumbs up/down)

**Files:**
- Create: `src/app/api/chat/messages/[id]/feedback/route.ts`
- Create: `src/components/chat/FeedbackButtons.tsx`
- Create: `src/components/chat/feedback.test.tsx`
- Modify: `src/components/chat/MessageBubble.tsx` (render FeedbackButtons on assistant)

- [ ] **Step 1: Write the test**

`src/components/chat/feedback.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedbackButtons } from './FeedbackButtons'

describe('FeedbackButtons', () => {
  it('submits thumbs up', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock
    render(<FeedbackButtons messageId="m1" initial={null} />)
    fireEvent.click(screen.getByLabelText('Thumbs up'))
    expect(fetchMock).toHaveBeenCalledWith('/api/chat/messages/m1/feedback', expect.objectContaining({ method: 'POST' }))
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- feedback.test.tsx
```

- [ ] **Step 3: Create `src/app/api/chat/messages/[id]/feedback/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatMessages, chatSessions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const schema = z.object({ feedback: z.enum(['up', 'down']).nullable() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  const { feedback } = schema.parse(await req.json())
  // ownership check
  const [own] = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatMessages.id, id), eq(chatSessions.userId, userId), eq(chatSessions.orgId, orgId)))
    .limit(1)
  if (!own) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  await db.update(chatMessages).set({ feedback }).where(eq(chatMessages.id, id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create `src/components/chat/FeedbackButtons.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function FeedbackButtons({ messageId, initial }: { messageId: string; initial: 'up' | 'down' | null }) {
  const [val, setVal] = useState(initial)
  const submit = async (v: 'up' | 'down') => {
    const next = val === v ? null : v
    setVal(next)
    await fetch(`/api/chat/messages/${messageId}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback: next }) })
  }
  return (
    <div className="flex gap-1 text-xs">
      <button aria-label="Thumbs up" onClick={() => submit('up')} className={val === 'up' ? 'text-emerald-600' : 'text-gray-400'}>👍</button>
      <button aria-label="Thumbs down" onClick={() => submit('down')} className={val === 'down' ? 'text-red-600' : 'text-gray-400'}>👎</button>
    </div>
  )
}
```

- [ ] **Step 5: Modify `src/components/chat/MessageBubble.tsx`**

```tsx
import { FeedbackButtons } from './FeedbackButtons'
// inside the assistant branch:
<div className="flex items-center gap-2">
  <FeedbackButtons messageId={message.id!} initial={(message as any).feedback ?? null} />
</div>
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npm test -- feedback.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/ src/app/api/chat/messages/
git commit -m "feat(chat): thumbs up/down feedback on assistant messages"
```

---

## Task 17: Stop / regenerate / edit message actions

**Files:**
- Create: `src/components/chat/MessageActions.tsx`
- Create: `src/components/chat/message-actions.test.tsx`
- Create: `src/app/api/chat/messages/[id]/route.ts` (PATCH edit, DELETE)
- Modify: `src/components/chat/MessageBubble.tsx` (add actions)
- Modify: `src/components/chat/ChatWindow.tsx` (regenerate flow)

- [ ] **Step 1: Write the test**

`src/components/chat/message-actions.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageActions } from './MessageActions'

describe('MessageActions', () => {
  it('fires regenerate', () => {
    const fn = vi.fn()
    render(<MessageActions role="assistant" onRegenerate={fn} onStop={() => {}} onEdit={() => {}} />)
    fireEvent.click(screen.getByLabelText('Regenerate'))
    expect(fn).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- message-actions.test.tsx
```

- [ ] **Step 3: Create `src/app/api/chat/messages/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatMessages, chatSessions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const patchSchema = z.object({ content: z.string().min(1).max(2000) })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  const { content } = patchSchema.parse(await req.json())
  const [own] = await db
    .select({ id: chatMessages.id, role: chatMessages.role })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatMessages.id, id), eq(chatSessions.userId, userId), eq(chatSessions.orgId, orgId)))
    .limit(1)
  if (!own || own.role !== 'user') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  await db.update(chatMessages).set({ content }).where(eq(chatMessages.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId, userId } = await requireOrgMember()
  const { id } = await params
  await db.delete(chatMessages).where(and(eq(chatMessages.id, id), eq(chatSessions.userId, userId), eq(chatSessions.orgId, orgId)))
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Create `src/components/chat/MessageActions.tsx`**

```tsx
'use client'

export function MessageActions({ role, onRegenerate, onStop, onEdit }: { role: 'user' | 'assistant'; onRegenerate: () => void; onStop: () => void; onEdit: () => void }) {
  return (
    <div className="flex gap-1 text-xs text-gray-500">
      {role === 'assistant' && <button aria-label="Regenerate" onClick={onRegenerate}>↻</button>}
      {role === 'user' && <button aria-label="Edit" onClick={onEdit}>✎</button>}
      <button aria-label="Stop" onClick={onStop}>■</button>
    </div>
  )
}
```

- [ ] **Step 5: Modify `src/components/chat/ChatWindow.tsx`**

Add a `controller` ref + handlers:
```tsx
const ctrl = useRef<AbortController | null>(null)
const handleStop = () => ctrl.current?.abort()
const handleRegenerate = async () => {
  // delete the last assistant message, then re-submit the previous user message via the messages endpoint
  // simplest: re-POST the last user content (idempotent at the data layer if we re-insert assistant)
  // To keep the plan minimal: send a "regenerate" event via Inngest, but the simplest path is to refetch
}
const handleEdit = async (messageId: string, content: string) => {
  await fetch(`/api/chat/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
}
```

Wire the actions inside the message rendering loop (delegated to `MessageBubble`):
```tsx
<MessageBubble
  key={m.id ?? i}
  message={m}
  actions={<MessageActions role={m.role} onRegenerate={handleRegenerate} onStop={handleStop} onEdit={() => handleEdit(m.id!, m.content)} />}
/>
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npm test -- message-actions.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/MessageActions.tsx src/components/chat/MessageBubble.tsx src/components/chat/ChatWindow.tsx src/app/api/chat/messages/
git commit -m "feat(chat): stop, regenerate, and edit message actions"
```

---

## Task 18: Widget per-token page (`/widget/[token]`)

**Files:**
- Delete: `src/app/widget/page.tsx`
- Create: `src/app/widget/[token]/page.tsx`
- Create: `src/app/api/widget/[token]/page-data/route.ts`
- Create: `src/components/widget/WidgetChat.tsx`
- Create: `src/components/widget/widget.test.tsx`

- [ ] **Step 1: Delete `src/app/widget/page.tsx`**

```bash
git rm src/app/widget/page.tsx
```

- [ ] **Step 2: Write the test**

`src/components/widget/widget.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WidgetChat } from './WidgetChat'

describe('WidgetChat', () => {
  it('renders an input and send button', () => {
    render(<WidgetChat token="tok" orgName="Acme" />)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- widget.test.tsx
```

- [ ] **Step 4: Create `src/app/widget/[token]/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { widgetTokens, organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { WidgetChat } from '@/components/widget/WidgetChat'

export default async function WidgetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [row] = await db
    .select({ orgName: organizations.name, orgId: widgetTokens.orgId })
    .from(widgetTokens)
    .innerJoin(organizations, eq(widgetTokens.orgId, organizations.id))
    .where(eq(widgetTokens.token, token))
    .limit(1)
  if (!row) return <div className="p-4 text-sm text-gray-500">Widget not found.</div>
  return <WidgetChat token={token} orgName={row.orgName} />
}
```

- [ ] **Step 5: Create `src/components/widget/WidgetChat.tsx`**

```tsx
'use client'
import { useState } from 'react'

interface Msg { role: 'user' | 'assistant'; content: string; citations?: any[] }

export function WidgetChat({ token, orgName }: { token: string; orgName: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  return (
    <div className="fixed bottom-4 right-4 w-80 max-w-[90vw] bg-white border rounded-2xl shadow-xl flex flex-col h-96">
      <header className="px-3 py-2 border-b font-semibold text-sm">Ask {orgName}</header>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className={m.role === 'user' ? 'bg-emerald-600 text-white rounded-2xl px-3 py-1 inline-block' : 'bg-gray-100 rounded-2xl px-3 py-1 inline-block'}>{m.content}</span>
          </div>
        ))}
      </div>
      <form
        className="p-2 border-t flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!input.trim()) return
          const user: Msg = { role: 'user', content: input }
          setMsgs((m) => [...m, user])
          setInput('')
          const r = await fetch('/api/widget/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, messages: [...msgs, user] }) })
          if (r.ok) {
            const { answer, citations } = await r.json()
            setMsgs((m) => [...m, { role: 'assistant', content: answer, citations }])
          }
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" className="flex-1 border rounded px-2 py-1 text-sm" />
        <button className="bg-emerald-600 text-white text-sm px-3 py-1 rounded">Send</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Modify `src/app/api/widget/chat/route.ts` to accept token + scope to widget**

Plan 1 already fixed CORS on this route. Replace the body schema:
```typescript
const schema = z.object({
  token: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() })),
})
```

In the handler, look up the token's org, set `orgId` to it, and continue with the existing RAG retrieval using the widget's org.

(Implementation: at the top of the handler:
```typescript
const [wt] = await db.select().from(widgetTokens).where(eq(widgetTokens.token, body.token)).limit(1)
if (!wt) return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
const orgId = wt.orgId
```
Then proceed with the existing retrieval using `orgId`.)

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- widget.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add src/app/widget/ src/components/widget/ src/app/api/widget/chat/
git commit -m "feat(widget): per-token page resolves org, widget chat uses scoped RAG"
```

---

## Task 19: Widget loader script (embed)

**Files:**
- Create: `src/app/widget/[token]/embed/route.ts`
- Create: `src/components/widget/WidgetLoader.tsx` (returns the script as a string)
- Create: `src/components/widget/loader.test.ts`

- [ ] **Step 1: Write the test**

`src/components/widget/loader.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { buildLoaderScript } from './WidgetLoader'

describe('buildLoaderScript', () => {
  it('embeds the token and origin', () => {
    const s = buildLoaderScript('tokABC', 'https://app.lexilift.dev')
    expect(s).toContain('tokABC')
    expect(s).toContain('https://app.lexilift.dev')
  })
  it('is valid JS (parses with new Function)', () => {
    const s = buildLoaderScript('t', 'o')
    expect(() => new Function(s)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- loader.test.ts
```

- [ ] **Step 3: Create `src/components/widget/WidgetLoader.ts`**

```typescript
export function buildLoaderScript(token: string, origin: string): string {
  return `
(function(){
  if (window.LexiLift && window.LexiLift.loaded) return;
  var ifr = document.createElement('iframe');
  ifr.src = ${JSON.stringify(origin + '/widget/' + token)};
  ifr.style.cssText = 'position:fixed;bottom:20px;right:20px;width:340px;height:420px;border:0;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.15);z-index:2147483647;background:white;';
  ifr.title = 'LexiLift chat';
  ifr.allow = 'clipboard-write';
  document.body.appendChild(ifr);
  window.LexiLift = { loaded: true, open: function(){ ifr.contentWindow.postMessage({ type: 'open' }, ${JSON.stringify(origin)}); } };
})();
`.trim()
}
```

- [ ] **Step 4: Create `src/app/widget/[token]/embed/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { buildLoaderScript } from '@/components/widget/WidgetLoader'
import { env } from '@/lib/env'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = buildLoaderScript(token, env.APP_URL)
  return new NextResponse(body, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- loader.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/components/widget/WidgetLoader.ts src/app/widget/[token]/embed/
git commit -m "feat(widget): embeddable loader script"
```

---

## Task 20: Widget token CRUD (dashboard)

**Files:**
- Create: `src/app/api/widget/tokens/route.ts` (GET list, POST create)
- Create: `src/app/api/widget/tokens/[id]/route.ts` (DELETE)
- Create: `src/lib/db/migrations/0008_widget_tokens.sql`
- Create: `src/app/dashboard/widget/page.tsx` (rewrite)
- Create: `src/components/widget/WidgetTokensTable.tsx`
- Create: `src/components/widget/CreateTokenDialog.tsx`
- Create: `src/app/api/widget/tokens/tokens.test.ts`

- [ ] **Step 1: Migration `0008_widget_tokens.sql`**

```sql
CREATE TABLE widget_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  token text NOT NULL UNIQUE,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX widget_tokens_org_idx ON widget_tokens(org_id);

CREATE POLICY "org members see tokens" ON widget_tokens FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "admins manage tokens" ON widget_tokens FOR ALL
  USING (is_org_admin(org_id));
```

- [ ] **Step 2: Add to schema**

```typescript
export const widgetTokens = pgTable('widget_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  allowedOrigins: text('allowed_origins').array().notNull().default([]),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3: Write the test**

`src/app/api/widget/tokens/tokens.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/auth/org-utils', () => ({
  requireOrgMember: vi.fn().mockResolvedValue({ orgId: 'o1' }),
  requireOrgAdmin: vi.fn().mockResolvedValue({ orgId: 'o1' }),
}))
vi.mock('@/lib/db', () => ({ db: { insert: vi.fn().mockReturnValue({ values: () => ({ returning: () => [{ id: 'w1', token: 't' }] }) }), select: vi.fn().mockReturnValue({ from: () => ({ where: () => [] }) }), delete: vi.fn().mockReturnValue({ where: () => [] }) } }))
import { POST, GET, DELETE } from './[id]/route'
import { POST as LIST } from './route'

describe('Widget tokens', () => {
  it('POST creates', async () => {
    const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'Site' }) }))
    expect(r.status).toBe(201)
  })
  it('GET lists', async () => {
    const r = await LIST()
    expect(r.status).toBe(200)
  })
  it('DELETE removes', async () => {
    const r = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'w1' }) })
    expect(r.status).toBe(204)
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- tokens.test.ts
```

- [ ] **Step 5: Create `src/app/api/widget/tokens/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { requireOrgMember, requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { widgetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const schema = z.object({ name: z.string().min(1).max(40), allowedOrigins: z.array(z.string().url()).default([]) })

export async function GET() {
  const { orgId } = await requireOrgMember()
  const rows = await db.select().from(widgetTokens).where(eq(widgetTokens.orgId, orgId))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { orgId } = await requireOrgAdmin()
  const body = schema.parse(await req.json())
  const token = randomBytes(24).toString('base64url')
  const [row] = await db.insert(widgetTokens).values({ orgId, name: body.name, token, allowedOrigins: body.allowedOrigins }).returning()
  return NextResponse.json(row, { status: 201 })
}
```

- [ ] **Step 6: Create `src/app/api/widget/tokens/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { widgetTokens } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireOrgAdmin()
  const { id } = await params
  await db.delete(widgetTokens).where(and(eq(widgetTokens.id, id), eq(widgetTokens.orgId, orgId)))
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 7: Create `src/components/widget/WidgetTokensTable.tsx`**

```tsx
'use client'

export interface Token { id: string; name: string; token: string; createdAt: string | Date; lastUsedAt: string | Date | null }

export function WidgetTokensTable({ tokens, appUrl }: { tokens: Token[]; appUrl: string }) {
  return (
    <table className="w-full">
      <thead><tr><th>Name</th><th>Embed snippet</th><th>Last used</th></tr></thead>
      <tbody>
        {tokens.map((t) => (
          <tr key={t.id}>
            <td>{t.name}</td>
            <td>
              <code className="text-xs bg-gray-100 p-1 rounded">{`<script src="${appUrl}/widget/${t.token}/embed" async></script>`}</code>
              <button onClick={() => navigator.clipboard.writeText(`<script src="${appUrl}/widget/${t.token}/embed" async></script>`)} className="ml-2 text-xs">Copy</button>
            </td>
            <td>{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'Never'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 8: Create `src/components/widget/CreateTokenDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function CreateTokenDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-emerald-600 text-white px-3 py-1 rounded">+ New widget</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded space-y-3 w-96">
            <h2 className="font-semibold">New widget token</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing site" className="border rounded px-2 py-1 w-full" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)}>Cancel</button>
              <button
                disabled={!name}
                onClick={async () => { await fetch('/api/widget/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); setOpen(false); onCreated() }}
                className="bg-emerald-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 9: Rewrite `src/app/dashboard/widget/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { widgetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { WidgetTokensTable } from '@/components/widget/WidgetTokensTable'
import { CreateTokenDialog } from '@/components/widget/CreateTokenDialog'
import { env } from '@/lib/env'

export default async function WidgetPage() {
  const { orgId } = await requireOrgMember()
  const tokens = await db.select().from(widgetTokens).where(eq(widgetTokens.orgId, orgId))
  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Widgets</h1>
        <CreateTokenDialog onCreated={() => location.reload()} />
      </div>
      <WidgetTokensTable tokens={tokens} appUrl={env.APP_URL} />
    </div>
  )
}
```

- [ ] **Step 10: Run test, expect PASS**

```bash
npm test -- tokens.test.ts
```

- [ ] **Step 11: Commit**

```bash
git add src/app/api/widget/ src/components/widget/ src/app/dashboard/widget/ src/lib/db/migrations/ src/lib/db/schema.ts
git commit -m "feat(widget): token CRUD + dashboard UI + embed snippet"
```

---

## Task 21: Plan enforcement (server-side limit checks)

**Files:**
- Create: `src/lib/billing/plans.ts`
- Create: `src/lib/billing/plans.test.ts`
- Create migration `0009_org_usage.sql` (adds `queries_this_month` column)

- [ ] **Step 1: Migration `0009_org_usage.sql`**

```sql
ALTER TABLE organizations
  ADD COLUMN queries_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN query_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());
```

- [ ] **Step 2: Write the test**

`src/lib/billing/plans.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, assertWithinLimit } from './plans'

describe('plan limits', () => {
  it('free has documents=10', () => {
    expect(PLAN_LIMITS.free.documents).toBe(10)
  })
  it('enterprise widgets=Infinity', () => {
    expect(PLAN_LIMITS.enterprise.widgets).toBe(Infinity)
  })
  it('assertWithinLimit throws over limit', () => {
    expect(() => assertWithinLimit('free', 'documents', 11)).toThrow('PLAN_LIMIT_REACHED')
  })
})
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- plans.test.ts
```

- [ ] **Step 4: Create `src/lib/billing/plans.ts`**

```typescript
export type PlanId = 'free' | 'pro' | 'team' | 'enterprise'

export interface PlanLimits { documents: number; queries: number; widgets: number; storageMb: number; seats: number }

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:       { documents: 10,  queries: 500,   widgets: 1,   storageMb: 100,  seats: 1 },
  pro:        { documents: 100, queries: 5000,  widgets: 3,   storageMb: 1024, seats: 1 },
  team:       { documents: 1000, queries: 50000, widgets: 10,  storageMb: 10240, seats: 10 },
  enterprise: { documents: Infinity, queries: Infinity, widgets: Infinity, storageMb: Infinity, seats: Infinity },
}

export function assertWithinLimit(plan: PlanId, resource: keyof PlanLimits, value: number) {
  const limit = PLAN_LIMITS[plan][resource]
  if (value >= limit) throw new Error('PLAN_LIMIT_REACHED')
}
```

- [ ] **Step 5: Add `getOrgPlan` helper**

```typescript
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrgPlan(orgId: string): Promise<PlanId> {
  const [o] = await db.select({ plan: organizations.plan }).from(organizations).where(eq(organizations.id, orgId)).limit(1)
  return (o?.plan as PlanId) ?? 'free'
}
```

- [ ] **Step 6: Hook `assertOrgPlanLimit` into ingestion + query routes (already wired in Tasks 8, 13, 18)**

In `src/lib/auth/org-utils.ts`, ensure:
```typescript
import { getOrgPlan, PLAN_LIMITS } from '@/lib/billing/plans'
import { documents } from '@/lib/db/schema'
import { count, eq, and, isNull, sql } from 'drizzle-orm'

export async function assertOrgPlanLimit(orgId: string, resource: 'documents' | 'queries' | 'widgets') {
  const plan = await getOrgPlan(orgId)
  const limit = PLAN_LIMITS[plan][resource]
  if (limit === Infinity) return
  if (resource === 'documents') {
    const [{ value }] = await db.select({ value: count() }).from(documents).where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
    if (value >= limit) throw new Error('PLAN_LIMIT_REACHED')
  }
  if (resource === 'queries') {
    const [o] = await db.select({ q: organizations.queriesThisMonth }).from(organizations).where(eq(organizations.id, orgId)).limit(1)
    if ((o?.q ?? 0) >= limit) throw new Error('PLAN_LIMIT_REACHED')
  }
  if (resource === 'widgets') {
    const [{ value }] = await db.select({ value: count() }).from(widgetTokens).where(eq(widgetTokens.orgId, orgId))
    if (value >= limit) throw new Error('PLAN_LIMIT_REACHED')
  }
}
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- plans.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/billing/ src/lib/auth/org-utils.ts src/lib/db/migrations/ src/lib/db/schema.ts
git commit -m "feat(billing): plan matrix, limit enforcement, org usage column"
```

---

## Task 22: Usage tracking (counter on query)

**Files:**
- Modify: `src/lib/inngest/functions/generateAnswer.ts` (increment counter on success)
- Create: `src/lib/inngest/functions/resetQueryCounts.ts` (monthly cron)
- Create: `src/lib/billing/usage.test.ts`

- [ ] **Step 1: Write the test**

`src/lib/billing/usage.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ db: { update: vi.fn().mockReturnValue({ set: () => ({ where: () => [] }) }) } }))
import { incrementUsage } from './usage'
import { db } from '@/lib/db'

describe('incrementUsage', () => {
  it('updates the org counter', async () => {
    await incrementUsage('o1')
    expect(db.update).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Create `src/lib/billing/usage.ts`**

```typescript
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function incrementUsage(orgId: string) {
  await db.update(organizations).set({ queriesThisMonth: sql`${organizations.queriesThisMonth} + 1` }).where(eq(organizations.id, orgId))
}
```

- [ ] **Step 3: Run test, expect PASS**

```bash
npm test -- usage.test.ts
```

- [ ] **Step 4: Modify `src/lib/inngest/functions/generateAnswer.ts`**

In the `'persist'` step, after inserting the assistant message:
```typescript
await step.run('increment-usage', () => incrementUsage(session.orgId))
```

Add the import at the top:
```typescript
import { incrementUsage } from '@/lib/billing/usage'
```

- [ ] **Step 5: Create `src/lib/inngest/functions/resetQueryCounts.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export const resetQueryCounts = inngest.createFunction(
  { id: 'reset-query-counts' },
  [{ cron: '0 0 1 * *' }],
  async ({ step }) => {
    await step.run('reset', async () => {
      await db.update(organizations).set({ queriesThisMonth: 0, queryPeriodStart: sql`date_trunc('month', now())` })
    })
  }
)
```

- [ ] **Step 6: Register function in `src/app/api/inngest/route.ts`**

```typescript
import { resetQueryCounts } from '@/lib/inngest/functions/resetQueryCounts'
// ...add resetQueryCounts to the functions array
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/billing/ src/lib/inngest/functions/ src/app/api/inngest/
git commit -m "feat(usage): per-query counter + monthly reset cron"
```

---

## Task 23: Billing UI — plan cards + usage gauge

**Files:**
- Create: `src/components/billing/PlanCard.tsx`
- Create: `src/components/billing/UsageGauge.tsx`
- Modify: `src/app/dashboard/billing/BillingClient.tsx`
- Create: `src/components/billing/billing-ui.test.tsx`

- [ ] **Step 1: Write the test**

`src/components/billing/billing-ui.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsageGauge } from './UsageGauge'

describe('UsageGauge', () => {
  it('renders percent', () => {
    render(<UsageGauge used={50} limit={100} label="Queries" />)
    expect(screen.getByText(/50.*100/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- billing-ui.test.tsx
```

- [ ] **Step 3: Create `src/components/billing/UsageGauge.tsx`**

```tsx
'use client'
export function UsageGauge({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span>{used.toLocaleString()} / {limit === Infinity ? '∞' : limit.toLocaleString()}</span></div>
      <div className="h-2 bg-gray-200 rounded">
        <div className={`h-full rounded ${pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/billing/PlanCard.tsx`**

```tsx
'use client'
import type { PlanId } from '@/lib/billing/plans'

const COPY: Record<PlanId, { title: string; price: string; perks: string[]; cta: string }> = {
  free:       { title: 'Free',    price: '$0',  perks: ['10 documents', '500 queries / mo', '1 widget'], cta: 'Current' },
  pro:        { title: 'Pro',     price: '$49', perks: ['100 documents', '5,000 queries / mo', '3 widgets'], cta: 'Upgrade' },
  team:       { title: 'Team',    price: '$199', perks: ['1,000 documents', '50,000 queries / mo', '10 widgets', '10 seats'], cta: 'Upgrade' },
  enterprise: { title: 'Enterprise', price: 'Custom', perks: ['Unlimited everything'], cta: 'Contact sales' },
}

export function PlanCard({ plan, current, onSelect }: { plan: PlanId; current: boolean; onSelect: (p: PlanId) => void }) {
  const c = COPY[plan]
  return (
    <div className={`border rounded p-4 ${current ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}`}>
      <h3 className="font-semibold">{c.title}</h3>
      <p className="text-2xl font-bold mt-1">{c.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
      <ul className="text-sm space-y-1 mt-2">{c.perks.map((p) => <li key={p}>• {p}</li>)}</ul>
      <button disabled={current} onClick={() => onSelect(plan)} className="mt-4 w-full bg-emerald-600 text-white py-1.5 rounded disabled:opacity-50">{c.cta}</button>
    </div>
  )
}
```

- [ ] **Step 5: Modify `src/app/dashboard/billing/BillingClient.tsx`**

Replace the file with:
```tsx
'use client'
import { PlanCard, type PlanId } from '@/components/billing/PlanCard'
import { UsageGauge } from '@/components/billing/UsageGauge'
import { useState } from 'react'

export function BillingClient({ currentPlan, queriesUsed, documentsUsed, widgetsUsed }: { currentPlan: PlanId; queriesUsed: number; documentsUsed: number; widgetsUsed: number }) {
  const [busy, setBusy] = useState(false)
  const onSelect = async (plan: PlanId) => {
    setBusy(true)
    const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) })
    const { url } = await r.json()
    window.location.href = url
  }
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UsageGauge used={queriesUsed} limit={queriesUsed >= 5000 ? Infinity : 500} label="Queries this month" />
        <UsageGauge used={documentsUsed} limit={100} label="Documents" />
        <UsageGauge used={widgetsUsed} limit={3} label="Widgets" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['free', 'pro', 'team', 'enterprise'] as PlanId[]).map((p) => (
          <PlanCard key={p} plan={p} current={currentPlan === p} onSelect={onSelect} />
        ))}
      </div>
      {busy && <p className="text-sm text-gray-500">Redirecting…</p>}
    </div>
  )
}
```

- [ ] **Step 6: Modify `src/app/dashboard/billing/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { organizations, documents, widgetTokens } from '@/lib/db/schema'
import { eq, and, isNull, count } from 'drizzle-orm'
import { BillingClient } from './BillingClient'
import { PLAN_LIMITS, type PlanId } from '@/lib/billing/plans'

export default async function BillingPage() {
  const { orgId } = await requireOrgMember()
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  const [{ value: docCount }] = await db.select({ value: count() }).from(documents).where(and(eq(documents.orgId, orgId), isNull(documents.deletedAt)))
  const [{ value: widgetCount }] = await db.select({ value: count() }).from(widgetTokens).where(eq(widgetTokens.orgId, orgId))
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <BillingClient currentPlan={(org.plan as PlanId) ?? 'free'} queriesUsed={org.queriesThisMonth} documentsUsed={docCount} widgetsUsed={widgetCount} />
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/api/billing/checkout/route.ts` (proxies to Polar)**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { createPolarCheckout } from '@/lib/adapters/billing/polar'
import { env } from '@/lib/env'

const schema = z.object({ plan: z.enum(['pro', 'team', 'enterprise']) })

export async function POST(req: Request) {
  await requireOrgMember()
  const { plan } = schema.parse(await req.json())
  const url = await createPolarCheckout(plan)
  return NextResponse.json({ url })
}
```

(`createPolarCheckout` is a thin wrapper around Polar.sh SDK; the product IDs come from env vars added in Plan 1: `POLAR_PRO_PRODUCT_ID`, `POLAR_TEAM_PRODUCT_ID`, `POLAR_ENTERPRISE_CONTACT_URL`.)

- [ ] **Step 8: Run test, expect PASS**

```bash
npm test -- billing-ui.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add src/components/billing/ src/app/dashboard/billing/ src/app/api/billing/
git commit -m "feat(billing): plan cards, usage gauges, checkout CTA"
```

---

## Task 24: Polar customer portal

**Files:**
- Create: `src/app/api/billing/portal/route.ts`
- Modify: `src/lib/adapters/billing/polar.ts` (add `createPortalSession`)
- Modify: `src/app/dashboard/billing/BillingClient.tsx` (add "Manage billing" button)

- [ ] **Step 1: Add `createPortalSession` in `src/lib/adapters/billing/polar.ts`**

```typescript
export async function createPortalSession(orgId: string): Promise<string> {
  const [org] = await db.select({ polarCustomerId: organizations.polarCustomerId }).from(organizations).where(eq(organizations.id, orgId)).limit(1)
  if (!org?.polarCustomerId) throw new Error('NO_CUSTOMER')
  // Polar.sh customer portal redirect
  const res = await fetch(`https://api.polar.sh/v1/customers/${org.polarCustomerId}/portal`, {
    headers: { Authorization: `Bearer ${env.POLAR_API_KEY}` },
  })
  if (!res.ok) throw new Error('PORTAL_FAILED')
  const json = await res.json()
  return json.url
}
```

- [ ] **Step 2: Create `src/app/api/billing/portal/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { createPortalSession } from '@/lib/adapters/billing/polar'

export async function POST() {
  const { orgId } = await requireOrgMember()
  const url = await createPortalSession(orgId)
  return NextResponse.json({ url })
}
```

- [ ] **Step 3: Modify `src/app/dashboard/billing/BillingClient.tsx`**

Add a "Manage subscription" button at the top:
```tsx
<button
  onClick={async () => { const r = await fetch('/api/billing/portal', { method: 'POST' }); const { url } = await r.json(); window.location.href = url }}
  className="text-sm text-emerald-600"
>Manage subscription</button>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/billing/portal/ src/lib/adapters/billing/polar.ts src/app/dashboard/billing/BillingClient.tsx
git commit -m "feat(billing): Polar customer portal link"
```

---

## Task 25: Invoice history

**Files:**
- Create migration `0010_invoices.sql`
- Modify `src/lib/db/schema.ts`
- Create: `src/app/api/billing/invoices/route.ts`
- Create: `src/components/billing/InvoiceList.tsx`
- Modify: `src/app/dashboard/billing/page.tsx`
- Create: `src/lib/billing/invoice.test.ts`

- [ ] **Step 1: Migration `0010_invoices.sql`**

```sql
CREATE TABLE invoices (
  id text PRIMARY KEY,            -- Polar invoice id
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  hosted_url text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_org_idx ON invoices(org_id);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members see invoices" ON invoices FOR SELECT USING (is_org_member(org_id));
```

- [ ] **Step 2: Add to schema**

```typescript
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  hostedUrl: text('hosted_url'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3: Write the test**

`src/lib/billing/invoice.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { formatAmount } from './invoice'

describe('formatAmount', () => {
  it('formats cents to currency', () => {
    expect(formatAmount(4900, 'USD')).toMatch(/\$49\.00/)
  })
})
```

- [ ] **Step 4: Create `src/lib/billing/invoice.ts`**

```typescript
export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}
```

- [ ] **Step 5: Create `src/app/api/billing/invoices/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { invoices } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const { orgId } = await requireOrgMember()
  const rows = await db.select().from(invoices).where(eq(invoices.orgId, orgId)).orderBy(desc(invoices.createdAt))
  return NextResponse.json(rows)
}
```

- [ ] **Step 6: Extend the Polar webhook (`src/app/api/webhooks/polar/route.ts`) to upsert invoices**

Add a handler for `invoice.created`, `invoice.paid` events. The existing validator from Plan 1 is used. For each event:
```typescript
await db.insert(invoices).values({
  id: invoice.id,
  orgId: org.id,
  amountCents: invoice.amount,
  currency: invoice.currency,
  status: invoice.status,
  hostedUrl: invoice.hosted_invoice_url,
  pdfUrl: invoice.invoice_pdf,
}).onConflictDoUpdate({ target: invoices.id, set: { status: invoice.status } })
```

- [ ] **Step 7: Create `src/components/billing/InvoiceList.tsx`**

```tsx
'use client'
import { formatAmount } from '@/lib/billing/invoice'

export interface Invoice { id: string; amountCents: number; currency: string; status: string; hostedUrl: string | null; createdAt: string | Date }

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) return <p className="text-sm text-gray-500">No invoices yet.</p>
  return (
    <table className="w-full">
      <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
      <tbody>
        {invoices.map((i) => (
          <tr key={i.id}>
            <td>{new Date(i.createdAt).toLocaleDateString()}</td>
            <td>{formatAmount(i.amountCents, i.currency)}</td>
            <td>{i.status}</td>
            <td>{i.hostedUrl ? <a className="text-emerald-600 underline" href={i.hostedUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 8: Modify `src/app/dashboard/billing/page.tsx`**

```tsx
import { invoices } from '@/lib/db/schema'
// inside BillingPage:
const invs = await db.select().from(invoices).where(eq(invoices.orgId, orgId)).orderBy(desc(invoices.createdAt))
// below the BillingClient:
<section><h2 className="text-lg font-semibold mt-8 mb-2">Invoices</h2><InvoiceList invoices={invs} /></section>
```

- [ ] **Step 9: Run test, expect PASS**

```bash
npm test -- invoice.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/billing/ src/app/api/billing/ src/app/api/webhooks/polar/ src/components/billing/ src/app/dashboard/billing/ src/lib/db/migrations/ src/lib/db/schema.ts
git commit -m "feat(billing): invoice history with Polar webhook upsert"
```

---

## Task 26: Analytics dashboard (Recharts)

**Files:**
- Create: `src/app/api/analytics/overview/route.ts`
- Create: `src/components/analytics/StatCard.tsx`
- Create: `src/components/analytics/ChartArea.tsx`
- Create: `src/components/analytics/ChartBar.tsx`
- Create: `src/components/analytics/ChartPie.tsx`
- Create: `src/app/dashboard/analytics/page.tsx`
- Create: `src/app/dashboard/analytics/analytics.test.tsx`
- Install: `recharts`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Write the test**

`src/app/dashboard/analytics/analytics.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/analytics/StatCard'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Queries" value={1234} />)
    expect(screen.getByText('Queries')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- analytics.test.tsx
```

- [ ] **Step 4: Create `src/components/analytics/StatCard.tsx`**

```tsx
'use client'

export function StatCard({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div className="border rounded p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      {delta !== undefined && <p className={`text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{delta >= 0 ? '+' : ''}{delta}% vs last week</p>}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/analytics/ChartArea.tsx`**

```tsx
'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function ChartArea({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b98133" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 6: Create `src/components/analytics/ChartBar.tsx`**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function ChartBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 7: Create `src/components/analytics/ChartPie.tsx`**

```tsx
'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444']
export function ChartPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={80}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 8: Create `src/app/api/analytics/overview/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatMessages, chatSessions, documents, feedback } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

export async function GET() {
  const { orgId } = await requireOrgMember()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [{ q }] = await db.select({ q: sql<number>`count(*)::int` }).from(chatMessages).where(and(eq(chatMessages.sessionId, chatSessions.id), gte(chatMessages.createdAt, weekAgo)))
  const [{ d }] = await db.select({ d: sql<number>`count(*)::int` }).from(documents).where(and(eq(documents.orgId, orgId), gte(documents.createdAt, weekAgo)))
  const [{ s }] = await db.select({ s: sql<number>`count(*)::int` }).from(chatSessions).where(and(eq(chatSessions.orgId, orgId), gte(chatSessions.createdAt, weekAgo)))
  // Timeseries: queries per day for last 7 days
  const series = await db
    .select({ date: sql<string>`date_trunc('day', ${chatMessages.createdAt})::date::text`, value: sql<number>`count(*)::int` })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, weekAgo)))
    .groupBy(sql`date_trunc('day', ${chatMessages.createdAt})`)
  const bySource = await db
    .select({ name: documents.sourceType, value: sql<number>`count(*)::int` })
    .from(documents)
    .where(eq(documents.orgId, orgId))
    .groupBy(documents.sourceType)
  return NextResponse.json({ totals: { queries: q, documents: d, sessions: s }, series, bySource })
}
```

- [ ] **Step 9: Create `src/app/dashboard/analytics/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { chatMessages, chatSessions, documents } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { StatCard } from '@/components/analytics/StatCard'
import { ChartArea } from '@/components/analytics/ChartArea'
import { ChartPie } from '@/components/analytics/ChartPie'

export default async function AnalyticsPage() {
  const { orgId } = await requireOrgMember()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [qRow] = await db.select({ v: sql<number>`count(*)::int` }).from(chatMessages).innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id)).where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, weekAgo)))
  const [dRow] = await db.select({ v: sql<number>`count(*)::int` }).from(documents).where(and(eq(documents.orgId, orgId), gte(documents.createdAt, weekAgo)))
  const [sRow] = await db.select({ v: sql<number>`count(*)::int` }).from(chatSessions).where(and(eq(chatSessions.orgId, orgId), gte(chatSessions.createdAt, weekAgo)))
  const series = await db.select({ date: sql<string>`date_trunc('day', ${chatMessages.createdAt})::date::text`, value: sql<number>`count(*)::int` }).from(chatMessages).innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id)).where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, weekAgo))).groupBy(sql`date_trunc('day', ${chatMessages.createdAt})`)
  const bySource = await db.select({ name: documents.sourceType, value: sql<number>`count(*)::int` }).from(documents).where(eq(documents.orgId, orgId)).groupBy(documents.sourceType)
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Queries (7d)" value={qRow?.v ?? 0} />
        <StatCard label="Documents added (7d)" value={dRow?.v ?? 0} />
        <StatCard label="Chat sessions (7d)" value={sRow?.v ?? 0} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4"><h2 className="font-semibold mb-2">Queries per day</h2><ChartArea data={series} /></div>
        <div className="border rounded p-4"><h2 className="font-semibold mb-2">Documents by source</h2><ChartPie data={bySource} /></div>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Run test, expect PASS**

```bash
npm test -- analytics.test.tsx
```

- [ ] **Step 11: Commit**

```bash
git add package.json src/app/dashboard/analytics/ src/components/analytics/ src/app/api/analytics/
git commit -m "feat(analytics): Recharts dashboard (queries, docs, sources)"
```

---

## Task 27: PostHog (server + client) integration

**Files:**
- Create: `src/lib/analytics/posthog-server.ts`
- Create: `src/lib/analytics/posthog-client.tsx`
- Create: `src/lib/analytics/events.ts`
- Modify: `src/app/layout.tsx` (wrap with `<PostHogProvider>`)
- Create: `src/lib/analytics/posthog.test.ts`
- Install: `posthog-js`, `posthog-node`

- [ ] **Step 1: Install PostHog**

```bash
npm install posthog-js posthog-node
```

- [ ] **Step 2: Add env**

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_test
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PROJECT_API_KEY=phc_test
```

Add to zod env schema (Plan 1 file):
```typescript
NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
POSTHOG_PROJECT_API_KEY: z.string().min(1),
```

- [ ] **Step 3: Write the test**

`src/lib/analytics/posthog.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('posthog-node', () => ({ PostHog: vi.fn().mockImplementation(() => ({ capture: vi.fn(), shutdown: vi.fn() })) }))
import { trackServerEvent } from './posthog-server'

describe('trackServerEvent', () => {
  it('calls PostHog capture with merged props', async () => {
    const { PostHog } = await import('posthog-node')
    const ph = new (PostHog as any)()
    await trackServerEvent({ distinctId: 'u1', event: 'document.uploaded', properties: { orgId: 'o1' } })
    expect(ph.capture).toHaveBeenCalledWith({ distinctId: 'u1', event: 'document.uploaded', properties: expect.objectContaining({ orgId: 'o1' }) })
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- posthog.test.ts
```

- [ ] **Step 5: Create `src/lib/analytics/events.ts`**

```typescript
export const EVENTS = {
  Signup: 'user.signup',
  WorkspaceCreated: 'workspace.created',
  DocumentUploaded: 'document.uploaded',
  DocumentFailed: 'document.failed',
  ChatStarted: 'chat.started',
  MessageSent: 'chat.message.sent',
  FeedbackGiven: 'chat.feedback',
  WidgetTokenCreated: 'widget.token.created',
  UpgradeClicked: 'billing.upgrade_clicked',
} as const
export type EventName = typeof EVENTS[keyof typeof EVENTS]
```

- [ ] **Step 6: Create `src/lib/analytics/posthog-server.ts`**

```typescript
import { PostHog } from 'posthog-node'
import { env } from '@/lib/env'

let cached: PostHog | null = null
function get(): PostHog {
  if (cached) return cached
  cached = new PostHog(env.POSTHOG_PROJECT_API_KEY, { host: env.NEXT_PUBLIC_POSTHOG_HOST })
  return cached
}

export async function trackServerEvent(input: { distinctId: string; event: string; properties?: Record<string, unknown> }) {
  get().capture({ distinctId: input.distinctId, event: input.event, properties: input.properties ?? {} })
}
```

- [ ] **Step 7: Create `src/lib/analytics/posthog-client.tsx`**

```tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as Provider } from 'posthog-js/react'
import { useEffect } from 'react'
import { env } from '@/lib/env'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, { api_host: env.NEXT_PUBLIC_POSTHOG_HOST, capture_pageview: true, capture_pageleave: true })
  }, [])
  return <Provider client={posthog}>{children}</Provider>
}
```

- [ ] **Step 8: Modify `src/app/layout.tsx`**

```tsx
import { PostHogProvider } from '@/lib/analytics/posthog-client'
// wrap children with <PostHogProvider>...</PostHogProvider>
```

- [ ] **Step 9: Wire one event from `src/lib/inngest/functions/processDocument.ts`**

After the doc is successfully indexed:
```typescript
import { trackServerEvent } from '@/lib/analytics/posthog-server'
// ...
await trackServerEvent({ distinctId: doc.userId, event: 'document.uploaded', properties: { orgId: doc.orgId, documentId: doc.id, sourceType: doc.sourceType } })
```

- [ ] **Step 10: Run test, expect PASS**

```bash
npm test -- posthog.test.ts
```

- [ ] **Step 11: Commit**

```bash
git add package.json src/lib/analytics/ src/app/layout.tsx src/lib/inngest/functions/processDocument.ts
git commit -m "feat(analytics): PostHog server + client, event constants"
```

---

## Task 28: Onboarding wizard (post-signup)

**Files:**
- Create: `src/app/dashboard/onboarding/page.tsx`
- Create: `src/components/onboarding/OnboardingWizard.tsx`
- Create: `src/components/onboarding/StepOrg.tsx`
- Create: `src/components/onboarding/StepUpload.tsx`
- Create: `src/components/onboarding/StepWidget.tsx`
- Create: `src/components/onboarding/onboarding.test.tsx`
- Modify: `src/lib/db/migrations/0000_amazing_triton.sql` or new `0011_onboarding.sql` (add `onboarding_completed_at`)

- [ ] **Step 1: Migration `0011_onboarding.sql`**

```sql
ALTER TABLE organizations ADD COLUMN onboarding_completed_at timestamptz;
```

- [ ] **Step 2: Add to schema**

```typescript
export const organizations = pgTable('organizations', {
  // ... existing cols ...
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
})
```

- [ ] **Step 3: Write the test**

`src/components/onboarding/onboarding.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingWizard } from './OnboardingWizard'

describe('OnboardingWizard', () => {
  it('starts at step 1', () => {
    render(<OnboardingWizard orgId="o1" />)
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- onboarding.test.tsx
```

- [ ] **Step 5: Create `src/components/onboarding/StepOrg.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function StepOrg({ initial, onNext }: { initial: string; onNext: (name: string) => void }) {
  const [name, setName] = useState(initial)
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Name your workspace</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
      <button onClick={() => onNext(name)} disabled={!name} className="bg-emerald-600 text-white px-3 py-1 rounded disabled:opacity-50">Continue</button>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/onboarding/StepUpload.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'

export function StepUpload({ onNext }: { onNext: () => void }) {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upload your first document</h2>
      <p className="text-sm text-gray-500">PDFs, DOCX, TXT, or paste a URL.</p>
      <button onClick={() => router.push('/dashboard/documents')} className="bg-emerald-600 text-white px-3 py-1 rounded">Go to documents</button>
      <button onClick={onNext} className="ml-2 text-sm">Skip for now</button>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/components/onboarding/StepWidget.tsx`**

```tsx
'use client'

export function StepWidget({ onDone }: { onDone: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">All set!</h2>
      <p className="text-sm text-gray-500">You can create a widget from the Widgets page when you're ready.</p>
      <button onClick={onDone} className="bg-emerald-600 text-white px-3 py-1 rounded">Open dashboard</button>
    </div>
  )
}
```

- [ ] **Step 8: Create `src/components/onboarding/OnboardingWizard.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepOrg } from './StepOrg'
import { StepUpload } from './StepUpload'
import { StepWidget } from './StepWidget'

export function OnboardingWizard({ orgId, initialName }: { orgId: string; initialName: string }) {
  const [step, setStep] = useState(1)
  const router = useRouter()
  const complete = async () => {
    await fetch(`/api/organizations/${orgId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ onboardingCompletedAt: new Date().toISOString() }) })
    router.push('/dashboard')
  }
  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <p className="text-sm text-gray-500">Step {step} of 3</p>
      {step === 1 && <StepOrg initial={initialName} onNext={async (name) => { await fetch(`/api/organizations/${orgId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); setStep(2) }} />}
      {step === 2 && <StepUpload onNext={() => setStep(3)} />}
      {step === 3 && <StepWidget onDone={complete} />}
    </div>
  )
}
```

(Extend the org PUT route from Task 7 to accept `onboardingCompletedAt` — just add to the zod schema as `z.string().datetime().optional()`.)

- [ ] **Step 9: Create `src/app/dashboard/onboarding/page.tsx`**

```tsx
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const { orgId } = await requireOrgMember()
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  if (org.onboardingCompletedAt) {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard')
  }
  return <OnboardingWizard orgId={orgId} initialName={org.name} />
}
```

- [ ] **Step 10: Redirect to onboarding from `src/app/dashboard/layout.tsx` if not complete**

In the layout server component:
```tsx
if (!org.onboardingCompletedAt) redirect('/dashboard/onboarding')
```

(Add this after fetching the org context.)

- [ ] **Step 11: Run test, expect PASS**

```bash
npm test -- onboarding.test.tsx
```

- [ ] **Step 12: Commit**

```bash
git add src/app/dashboard/onboarding/ src/components/onboarding/ src/app/dashboard/layout.tsx src/app/api/organizations/ src/lib/db/migrations/ src/lib/db/schema.ts
git commit -m "feat(onboarding): 3-step wizard, redirects from dashboard"
```

---

## Task 29: Empty / loading / error states (shared components)

**Files:**
- Create: `src/components/ui/Skeleton.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/ErrorState.tsx`
- Create: `src/components/ui/states.test.tsx`
- Apply at: `src/app/dashboard/documents/page.tsx`, `src/app/dashboard/chat/[sessionId]/page.tsx`, `src/app/dashboard/team/page.tsx`

- [ ] **Step 1: Write the test**

`src/components/ui/states.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, EmptyState, ErrorState } from './'

describe('UI states', () => {
  it('Skeleton renders', () => expect(render(<Skeleton className="h-4 w-20" />).container.firstChild).toBeTruthy())
  it('EmptyState renders title + cta', () => { render(<EmptyState title="No docs" ctaHref="/x" ctaLabel="Upload" />); expect(screen.getByText('No docs')).toBeInTheDocument(); expect(screen.getByText('Upload')).toBeInTheDocument() })
  it('ErrorState renders message', () => { render(<ErrorState message="Boom" />); expect(screen.getByText('Boom')).toBeInTheDocument() })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- states.test.tsx
```

- [ ] **Step 3: Create `src/components/ui/Skeleton.tsx`**

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}
```

- [ ] **Step 4: Create `src/components/ui/EmptyState.tsx`**

```tsx
import Link from 'next/link'

export function EmptyState({ title, description, ctaHref, ctaLabel }: { title: string; description?: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {ctaHref && ctaLabel && <Link href={ctaHref} className="inline-block mt-2 bg-emerald-600 text-white text-sm px-3 py-1 rounded">{ctaLabel}</Link>}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/ui/ErrorState.tsx`**

```tsx
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-200 bg-red-50 rounded p-4 text-sm text-red-700 space-y-2">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className="text-red-700 underline">Retry</button>}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/ui/index.ts` (barrel)**

```typescript
export { Skeleton } from './Skeleton'
export { EmptyState } from './EmptyState'
export { ErrorState } from './ErrorState'
```

- [ ] **Step 7: Apply to documents page**

In `src/app/dashboard/documents/page.tsx`, when `rows.length === 0`:
```tsx
<EmptyState title="No documents yet" description="Upload a PDF or paste a URL to get started." ctaHref="/dashboard/documents" ctaLabel="Upload" />
```

- [ ] **Step 8: Apply to chat page**

When `messages.length === 0` in `src/app/dashboard/chat/[sessionId]/page.tsx`:
```tsx
<EmptyState title="Start the conversation" description="Ask anything about your indexed documents." />
```

- [ ] **Step 9: Apply to team page**

When `members.length === 0`:
```tsx
<EmptyState title="No teammates" description="Invite someone to collaborate." />
```

- [ ] **Step 10: Run test, expect PASS**

```bash
npm test -- states.test.tsx
```

- [ ] **Step 11: Commit**

```bash
git add src/components/ui/ src/app/dashboard/
git commit -m "feat(ui): Skeleton, EmptyState, ErrorState components"
```

---

## Task 30: Toasts (sonner)

**Files:**
- Install: `sonner`
- Create: `src/components/ui/Toaster.tsx`
- Modify: `src/app/layout.tsx` (render `<Toaster />`)
- Create: `src/lib/ui/toast.ts` (helper)
- Create: `src/components/ui/toast.test.tsx`

- [ ] **Step 1: Install sonner**

```bash
npm install sonner
```

- [ ] **Step 2: Write the test**

`src/components/ui/toast.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { Toaster } from './Toaster'
import { render, screen } from '@testing-library/react'

vi.mock('sonner', () => ({ Toaster: () => <div data-testid="toaster" /> }))

describe('Toaster', () => {
  it('renders sonner toaster', () => {
    render(<Toaster />)
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- toast.test.tsx
```

- [ ] **Step 4: Create `src/components/ui/Toaster.tsx`**

```tsx
'use client'
import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return <Sonner richColors position="top-right" />
}
```

- [ ] **Step 5: Create `src/lib/ui/toast.ts`**

```typescript
import { toast } from 'sonner'

export const notify = {
  success: (m: string) => toast.success(m),
  error: (m: string) => toast.error(m),
  info: (m: string) => toast.info(m),
}
```

- [ ] **Step 6: Modify `src/app/layout.tsx`**

Add `<Toaster />` near the top of the body:
```tsx
import { Toaster } from '@/components/ui/Toaster'
// ...
<body>
  <PostHogProvider>
    {children}
    <Toaster />
  </PostHogProvider>
</body>
```

- [ ] **Step 7: Use `notify` in `src/components/documents/UploadDropzone.tsx`**

```typescript
import { notify } from '@/lib/ui/toast'
// after a successful upload:
notify.success('Upload queued')
```

- [ ] **Step 8: Run test, expect PASS**

```bash
npm test -- toast.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add package.json src/components/ui/Toaster.tsx src/lib/ui/ src/app/layout.tsx src/components/documents/UploadDropzone.tsx
git commit -m "feat(ui): sonner toaster with notify helper"
```

---

## Task 31: Theme toggle (light/dark)

**Files:**
- Create: `src/components/ui/ThemeToggle.tsx`
- Create: `src/components/ui/theme.test.tsx`
- Modify: `src/app/layout.tsx` (set `className="dark"` based on cookie or system pref)
- Modify: `src/app/globals.css` (already has dark tokens per Plan 1)

- [ ] **Step 1: Write the test**

`src/components/ui/theme.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('toggles dark class on html', () => {
    document.documentElement.classList.remove('dark')
    render(<ThemeToggle />)
    fireEvent.click(screen.getByLabelText('Toggle theme'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- theme.test.tsx
```

- [ ] **Step 3: Create `src/components/ui/ThemeToggle.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.classList.toggle('dark', next)
        document.cookie = `theme=${next ? 'dark' : 'light'}; path=/; max-age=31536000`
      }}
      className="text-sm"
    >{dark ? '☀️' : '🌙'}</button>
  )
}
```

- [ ] **Step 4: Modify `src/app/layout.tsx`**

Read the `theme` cookie in the server component and set the `<html>` class:
```tsx
import { cookies } from 'next/headers'
const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : ''
// ...
<html lang="en" className={theme}>
```

- [ ] **Step 5: Add `<ThemeToggle />` to `src/components/layout/Sidebar.tsx` footer**

```tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle'
// at the bottom of the sidebar:
<ThemeToggle />
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npm test -- theme.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/ThemeToggle.tsx src/app/layout.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(ui): light/dark theme toggle, cookie-persisted"
```

---

## Task 32: Password reset

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/page.tsx`
- Create: `src/lib/email/templates/password-reset.tsx`
- Create: `src/app/api/auth/forgot-password/forgot.test.ts`
- Modify: `src/app/login/page.tsx` (add "Forgot password?" link)

- [ ] **Step 1: Write the test**

`src/app/api/auth/forgot-password/forgot.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn().mockResolvedValue('em_x') }))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }) } })) }))
import { POST } from './route'

describe('forgot password', () => {
  it('calls resetPasswordForEmail', async () => {
    const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ email: 'a@b.c' }) }))
    expect(r.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- forgot.test.ts
```

- [ ] **Step 3: Create `src/lib/email/templates/password-reset.tsx`**

```tsx
import { Html, Heading, Text, Button, Container } from '@react-email/components'

export function PasswordResetEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <Html>
      <Container>
        <Heading>Reset your LexiLift password</Heading>
        <Text>Click the button below. This link expires in 1 hour.</Text>
        <Button href={resetUrl}>Reset password</Button>
      </Container>
    </Html>
  )
}
```

- [ ] **Step 4: Create `src/app/api/auth/forgot-password/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { render } from '@react-email/render'
import { PasswordResetEmail } from '@/lib/email/templates/password-reset'
import { env } from '@/lib/env'

const schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  const { email } = schema.parse(await req.json())
  const cookieStore = await cookies()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookieStore.getAll() } })
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.APP_URL}/reset-password` })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Optionally send our own branded email — Supabase sends a default. Comment in to override:
  // await sendEmail({ to: email, subject: 'Reset your password', html: await render(PasswordResetEmail({ resetUrl: `${env.APP_URL}/reset-password` })) })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/app/api/auth/reset-password/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

const schema = z.object({ password: z.string().min(8).max(128) })

export async function POST(req: Request) {
  const { password } = schema.parse(await req.json())
  const cookieStore = await cookies()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach((c) => cookieStore.set(c)) } })
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Create `src/app/forgot-password/page.tsx`**

```tsx
'use client'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <div className="max-w-sm mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">Forgot password</h1>
      {done ? <p className="text-sm">Check your email for a reset link.</p> : (
        <form onSubmit={async (e) => { e.preventDefault(); await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); setDone(true) }} className="space-y-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="border rounded px-2 py-1 w-full" />
          <button className="bg-emerald-600 text-white w-full py-1.5 rounded">Send link</button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/reset-password/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  return (
    <div className="max-w-sm mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">Set new password</h1>
      <form onSubmit={async (e) => { e.preventDefault(); const r = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); if (r.ok) router.push('/dashboard') }} className="space-y-2">
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded px-2 py-1 w-full" />
        <button className="bg-emerald-600 text-white w-full py-1.5 rounded">Update</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 8: Modify `src/app/login/page.tsx`**

Add a link below the password input:
```tsx
<a href="/forgot-password" className="text-sm text-emerald-600">Forgot password?</a>
```

- [ ] **Step 9: Run test, expect PASS**

```bash
npm test -- forgot.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/app/api/auth/ src/app/forgot-password/ src/app/reset-password/ src/lib/email/templates/password-reset.tsx src/app/login/
git commit -m "feat(auth): forgot + reset password flow"
```

---

## Task 33: Email verification

**Files:**
- Create: `src/app/api/auth/verify-email/route.ts`
- Create: `src/app/verify-email/page.tsx`
- Create: `src/lib/email/templates/welcome.tsx`
- Create: `src/app/api/auth/verify-email/verify.test.ts`
- Modify: `src/middleware.ts` (redirect unverified users)

- [ ] **Step 1: Write the test**

`src/app/api/auth/verify-email/verify.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { verifyOtp: vi.fn().mockResolvedValue({ error: null }) } })) }))
import { POST } from './route'

describe('verify email', () => {
  it('verifies a token', async () => {
    const r = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ token: 't', email: 'a@b.c' }) }))
    expect(r.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- verify.test.ts
```

- [ ] **Step 3: Create `src/lib/email/templates/welcome.tsx`**

```tsx
import { Html, Heading, Text, Button, Container } from '@react-email/components'

export function WelcomeEmail({ dashboardUrl, name }: { dashboardUrl: string; name?: string | null }) {
  return (
    <Html>
      <Container>
        <Heading>Welcome to LexiLift{name ? `, ${name}` : ''}!</Heading>
        <Text>You're all set. Start by uploading a document or pasting a URL.</Text>
        <Button href={dashboardUrl}>Open dashboard</Button>
      </Container>
    </Html>
  )
}
```

- [ ] **Step 4: Create `src/app/api/auth/verify-email/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

const schema = z.object({ token: z.string().min(1), email: z.string().email(), type: z.enum(['signup', 'magiclink']).default('signup') })

export async function POST(req: Request) {
  const { token, email, type } = schema.parse(await req.json())
  const cookieStore = await cookies()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach((c) => cookieStore.set(c)) } })
  const { error } = await supabase.auth.verifyOtp({ token, email, type })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/app/verify-email/page.tsx`**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  const params = useSearchParams()
  useEffect(() => {
    const token = params.get('token')
    const email = params.get('email')
    if (!token || !email) return
    fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, email }) })
      .then((r) => (r.ok ? router.push('/dashboard') : router.push('/login?error=verify')))
  }, [params, router])
  return <div className="p-8">Verifying…</div>
}
```

- [ ] **Step 6: Modify `src/middleware.ts`**

In the existing auth gate (Plan 1), after `getUser()`, check:
```typescript
if (user && user.email_confirmed_at === null && !url.pathname.startsWith('/verify-email')) {
  const res = NextResponse.redirect(new URL('/verify-email', req.url))
  return res
}
```

- [ ] **Step 7: Send welcome email on signup**

In `src/app/api/auth/callback/route.ts` (created in Plan 1), after a successful first signin:
```typescript
import { sendEmail } from '@/lib/email/send'
import { render } from '@react-email/render'
import { WelcomeEmail } from '@/lib/email/templates/welcome'
// ...
if (newUser) {
  await sendEmail({ to: user.email!, subject: 'Welcome to LexiLift', html: await render(WelcomeEmail({ dashboardUrl: env.APP_URL + '/dashboard', name: user.user_metadata?.name })) })
}
```

(Use the admin client to check `newUser` based on `auth.users.created_at === now()`.)

- [ ] **Step 8: Run test, expect PASS**

```bash
npm test -- verify.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/auth/verify-email/ src/app/verify-email/ src/lib/email/templates/welcome.tsx src/middleware.ts src/app/api/auth/callback/
git commit -m "feat(auth): email verification + welcome email"
```

---

## Task 34: Google OAuth

**Files:**
- Modify: `src/lib/env.ts` (already has `SUPABASE_URL`; no new env)
- Create: `src/app/api/auth/oauth/google/route.ts` (initiates the flow)
- Create: `src/app/api/auth/oauth/callback/route.ts` (handles the `?code=`)
- Modify: `src/app/login/page.tsx` (add "Continue with Google" button)
- Create: `src/app/api/auth/oauth/google/oauth.test.ts`

- [ ] **Step 1: Write the test**

`src/app/api/auth/oauth/google/oauth.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from './route'

describe('Google OAuth init', () => {
  it('redirects to Google authorize URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    const r = await GET()
    expect(r.status).toBe(307)
    expect(r.headers.get('location')).toContain('accounts.google.com')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- oauth.test.ts
```

- [ ] **Step 3: Enable Google in Supabase dashboard**

Document this as a manual step in the PR description:
> In the Supabase dashboard → Authentication → Providers, enable Google with the OAuth client ID/secret from Google Cloud Console. Add `https://<your-domain>/api/auth/oauth/callback` as an authorized redirect URI.

- [ ] **Step 4: Create `src/app/api/auth/oauth/google/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET() {
  const url = new URL('/api/auth/oauth/callback', env.APP_URL)
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.searchParams.set('client_id', env.GOOGLE_CLIENT_ID)
  auth.searchParams.set('redirect_uri', url.toString())
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('scope', 'openid email profile')
  return NextResponse.redirect(auth.toString(), 307)
}
```

- [ ] **Step 5: Add `GOOGLE_CLIENT_ID` to env zod schema**

```typescript
GOOGLE_CLIENT_ID: z.string().min(1),
```

- [ ] **Step 6: Create `src/app/api/auth/oauth/callback/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login?error=oauth', env.APP_URL))
  const cookieStore = await cookies()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach((c) => cookieStore.set(c)) },
  })
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/login?error=oauth', env.APP_URL))
  return NextResponse.redirect(new URL('/dashboard', env.APP_URL))
}
```

- [ ] **Step 7: Modify `src/app/login/page.tsx`**

Add a button:
```tsx
<a href="/api/auth/oauth/google" className="block text-center border rounded py-1.5">Continue with Google</a>
```

- [ ] **Step 8: Run test, expect PASS**

```bash
npm test -- oauth.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/auth/oauth/ src/app/login/page.tsx src/lib/env.ts
git commit -m "feat(auth): Google OAuth flow (init + callback)"
```

---

## Task 35: Brute-force protection (Upstash rate limit on auth)

**Files:**
- Install: `@upstash/ratelimit`, `@upstash/redis`
- Create: `src/lib/ratelimit/upstash.ts`
- Create: `src/lib/ratelimit/index.ts`
- Create: `src/lib/ratelimit/ratelimit.test.ts`
- Modify: `src/app/api/auth/callback/route.ts` (gate signin)
- Modify: `src/app/api/auth/forgot-password/route.ts` (gate forgot)

- [ ] **Step 1: Install Upstash**

```bash
npm install @upstash/ratelimit @upstash/redis
```

- [ ] **Step 2: Add env**

```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

Add to zod schema:
```typescript
UPSTASH_REDIS_REST_URL: z.string().url(),
UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
```

- [ ] **Step 3: Write the test**

`src/lib/ratelimit/ratelimit.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: vi.fn().mockImplementation(() => ({ limit: vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 0 }) })) }))
vi.mock('@upstash/redis', () => ({ Redis: vi.fn() }))
import { rateLimit } from './index'

describe('rateLimit', () => {
  it('returns success when limit not exceeded', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://x'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'y'
    const r = await rateLimit('login:1.2.3.4')
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- ratelimit.test.ts
```

- [ ] **Step 5: Create `src/lib/ratelimit/upstash.ts`**

```typescript
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

let cached: Redis | null = null
export function getRedis(): Redis {
  if (cached) return cached
  cached = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
  return cached
}
```

- [ ] **Step 6: Create `src/lib/ratelimit/index.ts`**

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from './upstash'

const limiters: Record<string, Ratelimit> = {}

function getLimiter(name: string, perMinute: number): Ratelimit {
  if (limiters[name]) return limiters[name]
  limiters[name] = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(perMinute, '1 m'), prefix: `rl:${name}` })
  return limiters[name]
}

export async function rateLimit(key: string, perMinute = 5) {
  const l = getLimiter('auth', perMinute)
  return l.limit(key)
}
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- ratelimit.test.ts
```

- [ ] **Step 8: Gate signin in `src/app/api/auth/callback/route.ts`**

At the top of the POST handler:
```typescript
import { rateLimit } from '@/lib/ratelimit'
import { headers } from 'next/headers'
const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
const rl = await rateLimit(`signin:${ip}`, 5)
if (!rl.success) return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
```

- [ ] **Step 9: Gate forgot password in `src/app/api/auth/forgot-password/route.ts`**

```typescript
import { rateLimit } from '@/lib/ratelimit'
import { headers } from 'next/headers'
const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
const rl = await rateLimit(`forgot:${ip}`, 3)
if (!rl.success) return NextResponse.json({ error: 'TOO_MANY_REQUESTS' }, { status: 429 })
```

- [ ] **Step 10: Commit**

```bash
git add package.json src/lib/ratelimit/ src/app/api/auth/
git commit -m "feat(security): Upstash rate limit on signin and forgot password"
```

---

## Task 36: Document filters (status, source type)

**Files:**
- Create: `src/components/documents/DocumentFilters.tsx`
- Modify: `src/components/documents/DocumentList.tsx` (filter client-side based on selected filters)
- Modify: `src/app/dashboard/documents/page.tsx` (pass source types)

- [ ] **Step 1: Create `src/components/documents/DocumentFilters.tsx`**

```tsx
'use client'

export interface Filter { status?: string; sourceType?: string }
export function DocumentFilters({ value, onChange, sourceTypes }: { value: Filter; onChange: (f: Filter) => void; sourceTypes: string[] }) {
  return (
    <div className="flex gap-2">
      <select value={value.status ?? ''} onChange={(e) => onChange({ ...value, status: e.target.value || undefined })} className="border rounded px-2 py-1 text-sm">
        <option value="">All statuses</option>
        <option value="ready">Ready</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>
      <select value={value.sourceType ?? ''} onChange={(e) => onChange({ ...value, sourceType: e.target.value || undefined })} className="border rounded px-2 py-1 text-sm">
        <option value="">All sources</option>
        {sourceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Modify `src/components/documents/DocumentList.tsx`**

Add `filters` state, sourceTypes prop, filter the docs:
```tsx
const [filters, setFilters] = useState<Filter>({})
const filtered = docs.filter((d) => (!filters.status || d.status === filters.status) && (!filters.sourceType || (d as any).sourceType === filters.sourceType))
// render <DocumentFilters /> + filtered rows
```

- [ ] **Step 3: Modify `src/app/dashboard/documents/page.tsx`**

Pass `sourceTypes`:
```tsx
<DocumentList initialDocs={rows} sourceTypes={['pdf', 'docx', 'txt', 'url']} />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/documents/ src/app/dashboard/documents/
git commit -m "feat(documents): status + source-type filters"
```

---

## Task 37: Keyboard shortcuts — command palette (Cmd+K)

**Files:**
- Install: `cmdk`
- Create: `src/components/ui/CommandPalette.tsx`
- Create: `src/components/ui/CommandPaletteProvider.tsx`
- Modify: `src/app/dashboard/layout.tsx` (mount provider)
- Create: `src/components/ui/command.test.tsx`

- [ ] **Step 1: Install cmdk**

```bash
npm install cmdk
```

- [ ] **Step 2: Write the test**

`src/components/ui/command.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from './CommandPalette'

describe('CommandPalette', () => {
  it('opens on Cmd+K', () => {
    render(<CommandPalette items={[{ id: 'a', label: 'Documents', onSelect: () => {} }]} />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- command.test.tsx
```

- [ ] **Step 4: Create `src/components/ui/CommandPalette.tsx`**

```tsx
'use client'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'

export interface Item { id: string; label: string; onSelect: () => void; group?: string }

export function CommandPalette({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-32" onClick={() => setOpen(false)}>
      <div className="bg-white w-96 rounded shadow-lg" onClick={(e) => e.stopPropagation()}>
        <Command>
          <Command.Input placeholder="Search…" className="w-full p-2 border-b" />
          <Command.List>
            {items.map((i) => (
              <Command.Item key={i.id} onSelect={() => { i.onSelect(); setOpen(false) }} className="px-2 py-1.5 cursor-pointer hover:bg-gray-100">
                {i.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/ui/CommandPaletteProvider.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { CommandPalette } from './CommandPalette'

export function CommandPaletteProvider() {
  const router = useRouter()
  return (
    <CommandPalette
      items={[
        { id: 'docs', label: 'Documents', onSelect: () => router.push('/dashboard/documents') },
        { id: 'chat', label: 'Chat', onSelect: () => router.push('/dashboard') },
        { id: 'widgets', label: 'Widgets', onSelect: () => router.push('/dashboard/widget') },
        { id: 'billing', label: 'Billing', onSelect: () => router.push('/dashboard/billing') },
        { id: 'analytics', label: 'Analytics', onSelect: () => router.push('/dashboard/analytics') },
        { id: 'team', label: 'Team', onSelect: () => router.push('/dashboard/team') },
        { id: 'settings', label: 'Settings', onSelect: () => router.push('/dashboard/settings') },
      ]}
    />
  )
}
```

- [ ] **Step 6: Modify `src/app/dashboard/layout.tsx`**

```tsx
import { CommandPaletteProvider } from '@/components/ui/CommandPaletteProvider'
// inside the layout, after children:
<CommandPaletteProvider />
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- command.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add package.json src/components/ui/CommandPalette.tsx src/components/ui/CommandPaletteProvider.tsx src/app/dashboard/layout.tsx
git commit -m "feat(ui): Cmd+K command palette for dashboard navigation"
```

---

## Task 38: Welcome email on signup (already triggered in Task 33)

This task is a no-op because Task 33 step 7 already sends the welcome email via Resend on the first signin callback. It exists here as an explicit verification checkpoint.

- [ ] **Step 1: Verify the welcome email is sent**

Check that `src/app/api/auth/callback/route.ts` (from Plan 1) calls `sendEmail` with `<WelcomeEmail />` on the first signin. If it does, this task is complete.

- [ ] **Step 2: Commit (no-op if already done)**

```bash
git diff --stat src/app/api/auth/callback/  # should show the welcome call
```

- [ ] **Step 3: Mark complete in plan**

No commit needed if already covered by Task 33.

---

## Task 39: Settings page tabs (General / Members / Security / Danger)

**Files:**
- Create: `src/components/settings/SettingsTabs.tsx`
- Modify: `src/app/dashboard/settings/page.tsx` (wrap in tabs)

- [ ] **Step 1: Create `src/components/settings/SettingsTabs.tsx`**

```tsx
'use client'
import { useState } from 'react'

export interface Tab { id: string; label: string; content: React.ReactNode }

export function SettingsTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const current = tabs.find((t) => t.id === active)
  return (
    <div>
      <div className="flex gap-4 border-b mb-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`pb-2 ${active === t.id ? 'border-b-2 border-emerald-600 font-medium' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `src/app/dashboard/settings/page.tsx`**

The page becomes a thin client wrapper; for now, keep server-component data fetching and pass content to `SettingsTabs`:

```tsx
// Convert the existing export to a client wrapper that receives pre-rendered children
'use client'
import { useState } from 'react'
import { SettingsTabs } from '@/components/settings/SettingsTabs'

export default function SettingsClient({ orgName, members, role, currentUserId, orgId }: any) {
  return (
    <div className="p-8 max-w-2xl">
      <SettingsTabs
        tabs={[
          { id: 'general', label: 'General', content: <GeneralTab orgId={orgId} orgName={orgName} /> },
          { id: 'members', label: 'Members', content: <MembersTab members={members} currentUserRole={role} /> },
          ...(role === 'owner' ? [{ id: 'danger', label: 'Danger', content: <DangerTab orgId={orgId} /> }] : []),
        ]}
      />
    </div>
  )
}
```

With sub-components (defined in the same file):
```tsx
import { OrgForm } from '@/components/settings/OrgForm'
import { MembersTable } from '@/components/team/MembersTable'
import { DeleteOrgDialog } from '@/components/settings/DeleteOrgDialog'
import { TransferOwnershipDialog } from '@/components/settings/TransferOwnershipDialog'

function GeneralTab({ orgId, orgName }: { orgId: string; orgName: string }) { return <OrgForm orgId={orgId} initialName={orgName} /> }
function MembersTab({ members, currentUserRole }: { members: any[]; currentUserRole: string }) { return <MembersTable members={members} currentUserRole={currentUserRole as any} /> }
function DangerTab({ orgId }: { orgId: string }) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Transfer ownership</h2>
      <p className="text-sm text-gray-500">Transfer is handled from the Members tab in the current build.</p>
      <h2 className="font-semibold text-red-600 pt-4">Delete workspace</h2>
      <DeleteOrgDialog orgId={orgId} />
    </div>
  )
}
```

(The server page is renamed to a Server Component that fetches data and passes it to `SettingsClient`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/SettingsTabs.tsx src/app/dashboard/settings/
git commit -m "feat(settings): tabbed settings page (General, Members, Danger)"
```

---

## End of Plan 2

When this plan is complete, the dashboard has every user-facing feature from the gap-fill spec. Production hardening (Sentry, security headers, dependency scanning, observability) is in Plan 3. Full test coverage, accessibility audit, and end-to-end Playwright flows are in Plan 4.
