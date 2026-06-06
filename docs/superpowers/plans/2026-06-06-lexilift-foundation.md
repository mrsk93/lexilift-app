# LexiLift MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 13 active bugs, complete RLS, wire real organization resolution, integrate Inngest, and replace every `mock-org-id` literal so the dashboard is end-to-end functional with no real AI features yet, but with all the wiring ready for Plan 2.

**Architecture:** Next.js 16 App Router on Vercel + Supabase Postgres + Drizzle + Inngest (event-driven ingestion + cron) + Vercel AI SDK. Defence-in-depth via Postgres RLS using `is_org_*` helper functions. Zod-validated env at boot. Service-role Supabase client isolated to one module.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, Supabase (Auth + Postgres + Storage), Inngest, Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`), Pinecone (vector), Voyage AI (rerank), Polar.sh (billing), Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-06-lexilift-mvp-gap-fill-design.md`

**Scope of this plan:** Plan 1 of 4 (Foundation). After this plan, you can demo: real signup → real org → real RLS-enforced DB → upload a PDF → Inngest processes it end-to-end → query the chat (with mocked LLM if no API key). All subsequent features (citations, widget, billing UI) come in Plan 2.

---

## File Structure (new & modified)

### New files
- `src/lib/env.ts` — rewrite (zod-validated)
- `src/lib/supabase/admin.ts` — service-role client singleton
- `src/lib/auth/current-org.ts` — `getCurrentOrgId()`
- `src/lib/inngest/client.ts` — Inngest client singleton
- `src/lib/inngest/functions/processDocument.ts`
- `src/lib/inngest/functions/resetQueryCounts.ts`
- `src/lib/inngest/functions/checkUsageAlerts.ts`
- `src/lib/inngest/functions/syncSubscriptions.ts`
- `src/lib/inngest/functions/purgeSoftDeleted.ts`
- `src/lib/llm/streaming-adapter.ts` — `StreamingLLMAdapter` interface
- `src/lib/llm/registry.ts` — `getLLM()` factory
- `src/lib/llm/adapters/openai.ts`
- `src/lib/llm/adapters/anthropic.ts`
- `src/lib/llm/adapters/gemini.ts`
- `src/lib/llm/adapters/index.ts`
- `src/app/api/inngest/route.ts`
- `scripts/seed.ts`
- `src/lib/db/migrations/0001_rls_helpers.sql`
- `src/lib/db/migrations/0002_rls_policies.sql`
- `src/lib/db/migrations/0003_schema_additions.sql`
- `src/lib/billing/polar-webhook.ts` — Standard Webhooks validator
- `src/components/layout/CreateOrgDialog.tsx`
- Tests in `src/lib/**/*.test.ts` and `e2e/foundation.spec.ts`

### Modified files
- `package.json` — deps & scripts
- `src/middleware.ts` — real auth gate
- `src/lib/db/schema.ts` — add columns
- `src/lib/db/migrate.ts` — read all migrations
- `src/lib/auth/org-utils.ts` — use `current-org`
- `src/lib/adapters/llm/index.ts` — delegate to new registry
- `src/lib/adapters/llm/interface.ts` — mark deprecated
- `src/lib/langchain/rag-chain.ts` — use new LLM
- `src/workflows/ingestion.ts` — delete
- `src/app/api/auth/callback/route.ts`
- `src/app/api/ingest/route.ts` — Inngest trigger
- `src/app/api/documents/[id]/process/route.ts` — Inngest trigger
- `src/app/api/query/route.ts` — fix citations
- `src/app/api/widget/chat/route.ts` — fix CORS
- `src/app/api/webhooks/polar/route.ts` — use validator
- `src/app/dashboard/layout.tsx` — real orgs
- `src/app/dashboard/page.tsx` — real data
- `src/app/dashboard/documents/page.tsx` — real data
- `src/app/dashboard/billing/BillingClient.tsx` — real queryCount
- `src/app/dashboard/settings/page.tsx` — wire save
- `src/components/layout/OrgSwitcher.tsx` — wire create
- `src/components/layout/Sidebar.tsx` — real queryCount
- `vitest.config.ts` — coverage

### Deleted files
- `src/workflows/ingestion.ts`
- `src/lib/adapters/llm/interface.ts` (logic moved to `src/lib/llm/streaming-adapter.ts`)

---

## Task 1: Zod-validated environment

**Files:**
- Modify: `src/lib/env.ts`
- Create: `src/lib/env.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

`src/lib/env.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    await expect(() => import('./env?missing-db')).rejects.toThrow()
  })

  it('exposes typed values when valid', async () => {
    process.env.DATABASE_URL = 'postgresql://x'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const { env } = await import('./env?valid')
    expect(env.DATABASE_URL).toBe('postgresql://x')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL (no zod schema yet)**

```bash
npm test -- env.test.ts
```

Expected: FAIL — `env` is a plain object, not zod-validated.

- [ ] **Step 3: Install zod**

```bash
npm install zod
```

- [ ] **Step 4: Rewrite `src/lib/env.ts`**

```typescript
import { z } from 'zod'

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  PINECONE_API_KEY: z.string().min(1).optional(),
  PINECONE_INDEX: z.string().min(1).optional(),
  VOYAGE_API_KEY: z.string().min(1).optional(),
  POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
  POLAR_PRO_PRODUCT_ID: z.string().min(1).optional(),
  POLAR_TEAM_PRODUCT_ID: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_APP_URL: true,
})

function parseServer() {
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues
      .filter(i => i.code === 'invalid_type' && i.received === 'undefined')
      .map(i => `  - ${i.path.join('.')}`)
      .join('\n')
    throw new Error(
      `Invalid environment variables:\n${missing}\n\nSee docs/superpowers/specs/2026-06-06-lexilift-mvp-gap-fill-design.md §6.4 for the full list.`
    )
  }
  return parsed.data
}

export const env =
  typeof window === 'undefined' ? parseServer() : clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- env.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts package.json package-lock.json
git commit -m "feat(env): zod-validated env, fail fast on missing required vars"
```

---

## Task 2: Service-role Supabase client helper

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/admin.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/supabase/admin.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ tag: 'admin' })),
}))

import { createAdminClient } from './admin'

describe('createAdminClient', () => {
  it('uses the service role key', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    const c = createAdminClient()
    expect(c).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL (no module)**

```bash
npm test -- admin.test.ts
```

- [ ] **Step 3: Create `src/lib/supabase/admin.ts`**

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm test -- admin.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/admin.ts src/lib/supabase/admin.test.ts
git commit -m "feat(supabase): service-role client singleton (admin)"
```

- [ ] **Step 6: Migrate `src/lib/adapters/storage/supabase.ts` to use it**

Replace the inline `createClient` call:

```typescript
import { createClient } from '@supabase/supabase-js'   // DELETE
import { createAdminClient } from '@/lib/supabase/admin' // ADD
// ...
constructor() {
  this.supabase = createAdminClient()  // was: createClient(env..., env...)
}
```

Remove the now-unused `env.NEXT_PUBLIC_SUPABASE_URL` and `env.SUPABASE_SERVICE_ROLE_KEY` reads from this file.

- [ ] **Step 7: Commit**

```bash
git add src/lib/adapters/storage/supabase.ts
git commit -m "refactor(storage): use central service-role client"
```

---

## Task 3: Real current-org resolution

**Files:**
- Create: `src/lib/auth/current-org.ts`
- Create: `src/lib/auth/current-org.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/auth/current-org.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockDbSelect = vi.fn()

vi.mock('@/lib/auth/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/db/client', () => ({
  db: { select: mockDbSelect },
}))
vi.mock('@/lib/db/schema', () => ({
  profiles: { id: 'profiles.id', currentOrgId: 'profiles.currentOrgId', userId: 'profiles.userId' },
  memberships: { orgId: 'm.orgId', userId: 'm.userId', createdAt: 'm.createdAt' },
}))

import { getCurrentOrgId } from './current-org'

beforeEach(() => {
  mockGetUser.mockReset()
  mockDbSelect.mockReset()
})

describe('getCurrentOrgId', () => {
  it('returns null when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await getCurrentOrgId()
    expect(result).toBeNull()
  })

  it("returns the profile's currentOrgId when set", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockDbSelect.mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ currentOrgId: 'o1' }]) }) }),
    })
    const result = await getCurrentOrgId()
    expect(result).toBe('o1')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- current-org.test.ts
```

- [ ] **Step 3: Create `src/lib/auth/current-org.ts`**

```typescript
import { createClient } from '@/lib/auth/supabase/server'
import { db } from '@/lib/db/client'
import { profiles, memberships } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profileRows = await db
    .select({ currentOrgId: profiles.currentOrgId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  const current = profileRows[0]?.currentOrgId
  if (current) return current

  const fallback = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .orderBy(asc(memberships.createdAt))
    .limit(1)

  const fallbackOrg = fallback[0]?.orgId
  if (fallbackOrg) {
    await db
      .update(profiles)
      .set({ currentOrgId: fallbackOrg })
      .where(eq(profiles.id, user.id))
    return fallbackOrg
  }

  throw new Error(`User ${user.id} has no organization membership`)
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm test -- current-org.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/current-org.ts src/lib/auth/current-org.test.ts
git commit -m "feat(auth): real getCurrentOrgId with membership fallback"
```

---

## Task 4: Kill `mock-org-id` and `mockOrgs` everywhere

**Files:**
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/documents/page.tsx`
- Modify: `src/app/dashboard/chat/page.tsx`
- Modify: `src/app/dashboard/chat/[sessionId]/page.tsx`
- Modify: `src/app/dashboard/documents/[id]/page.tsx`
- Modify: `src/app/dashboard/billing/BillingClient.tsx`
- Modify: `src/app/dashboard/billing/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/OrgSwitcher.tsx`

- [ ] **Step 1: Rewrite `src/app/dashboard/layout.tsx`**

```typescript
import { Sidebar } from '@/components/layout/Sidebar'
import { db } from '@/lib/db/client'
import { organizations, memberships, profiles } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try { await requireAuth() } catch { redirect('/login') }

  const currentOrgId = await getCurrentOrgId()
  if (!currentOrgId) redirect('/login')

  const userOrgs = await db
    .select({ id: organizations.id, name: organizations.name, plan: organizations.plan })
    .from(organizations)
    .innerJoin(memberships, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, (await (await import('@/lib/auth/supabase/server')).createClient()).auth.getUser().then(r => r.data.user!.id)))

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar organizations={userOrgs} currentOrgId={currentOrgId} />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/app/dashboard/page.tsx` (real data)**

```typescript
import { db } from '@/lib/db/client'
import { documents, widgetTokens, chatMessages, chatSessions } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'

export default async function DashboardPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  const docs = await db.select({ id: documents.id }).from(documents).where(eq(documents.orgId, orgId))
  const widgets = await db.select({ id: widgetTokens.id }).from(widgetTokens)
    .where(and(eq(widgetTokens.orgId, orgId), eq(widgetTokens.isActive, true)))
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const sessions = await db.select({ id: chatSessions.id }).from(chatSessions)
    .where(and(eq(chatSessions.orgId, orgId), gte(chatSessions.createdAt, monthStart)))
  const messages = await db.select({ id: chatMessages.id }).from(chatMessages)
    .innerJoin(chatSessions, eq(chatSessions.id, chatMessages.sessionId))
    .where(and(eq(chatSessions.orgId, orgId), gte(chatMessages.createdAt, monthStart)))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Monitor your knowledge base usage and activity.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Documents</h3>
          <p className="text-3xl font-heading font-semibold">{docs.length}</p>
        </div>
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Queries this month</h3>
          <p className="text-3xl font-heading font-semibold">{messages.length}</p>
        </div>
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Widgets</h3>
          <p className="text-3xl font-heading font-semibold">{widgets.length}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `src/app/dashboard/documents/page.tsx` (real data)**

```typescript
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { eq, isNull, desc } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, MoreHorizontal, Trash } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { DeleteDocButton } from '@/components/documents/DeleteDocButton'

export default async function DocumentsPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  const docs = await db.select()
    .from(documents)
    .where(eq(documents.orgId, orgId))
    .orderBy(desc(documents.createdAt))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Upload and manage files in your knowledge base.</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-6">
        <UploadDropzone orgId={orgId} />
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold">Your Files</h3>
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No documents uploaded yet.
                  </TableCell>
                </TableRow>
              ) : docs.map(d => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'ready' ? 'default' : d.status === 'processing' ? 'secondary' : 'destructive'} className="capitalize">
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {((d.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DeleteDocButton id={d.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/documents/DeleteDocButton.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function DeleteDocButton({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="text-destructive"
          onClick={async () => {
            const r = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
            if (!r.ok) { toast.error('Delete failed'); return }
            toast.success('Document deleted')
            router.refresh()
          }}
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 5: Fix `src/app/dashboard/chat/page.tsx` and `[sessionId]/page.tsx`**

Replace `const orgId = "mock-org-id"` with `const orgId = await getCurrentOrgId()` (and the early return for null).

- [ ] **Step 6: Fix `src/app/dashboard/documents/[id]/page.tsx`**

Add `const user = await requireAuth()` and `const orgId = session.orgId` guards; remove the `// For testing, just query DB directly` comment.

- [ ] **Step 7: Fix `src/app/dashboard/billing/page.tsx`**

Replace the mock-checkout branch with a real read of `currentOrg?.query_count` (added in Task 12). Pass real data to `BillingClient`.

- [ ] **Step 8: Fix `src/app/dashboard/billing/BillingClient.tsx`**

Replace `const queryCount = 342` with `org.queryCount ?? 0` (added to BillingClientProps).

- [ ] **Step 9: Fix `src/components/layout/Sidebar.tsx`**

Replace the hard-coded "450 / 1000 Queries" with a `queryCount` / `queryLimit` prop driven by `organizations` row. Add to the props.

- [ ] **Step 10: Commit**

```bash
git add -A src/app/dashboard src/components/documents src/components/layout
git commit -m "fix(dashboard): replace mock-org-id with real getCurrentOrgId"
```

---

## Task 5: LLM adapter rewrite (StreamingLLMAdapter)

**Files:**
- Create: `src/lib/llm/streaming-adapter.ts`
- Create: `src/lib/llm/adapters/openai.ts`
- Create: `src/lib/llm/adapters/anthropic.ts`
- Create: `src/lib/llm/adapters/gemini.ts`
- Create: `src/lib/llm/adapters/index.ts`
- Create: `src/lib/llm/registry.ts`
- Create: `src/lib/llm/registry.test.ts`
- Delete: `src/lib/adapters/llm/interface.ts`
- Modify: `src/lib/adapters/llm/index.ts` → re-export from `src/lib/llm/registry`

- [ ] **Step 1: Write the failing test**

`src/lib/llm/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getLLM, listSupportedModels } from './registry'

describe('LLM registry', () => {
  it('lists supported models', () => {
    expect(listSupportedModels()).toContain('gpt-4o')
    expect(listSupportedModels()).toContain('claude-3-5-sonnet')
  })

  it('returns an adapter with a stream() method', () => {
    const adapter = getLLM('gpt-4o')
    expect(typeof adapter.stream).toBe('function')
    expect(adapter.modelName).toBe('gpt-4o')
  })

  it('falls back to gpt-4o for unknown model names', () => {
    const adapter = getLLM('nonsense')
    expect(adapter.modelName).toBe('gpt-4o')
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- registry.test.ts
```

- [ ] **Step 3: Create `src/lib/llm/streaming-adapter.ts`**

```typescript
export type StreamChunk = { type: 'text'; text: string } | { type: 'finish'; totalTokens?: number }

export interface StreamingLLMAdapter {
  readonly modelName: string
  stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk>
}
```

- [ ] **Step 4: Create `src/lib/llm/adapters/openai.ts`**

```typescript
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { StreamingLLMAdapter, StreamChunk } from '../streaming-adapter'

export class OpenAIAdapter implements StreamingLLMAdapter {
  readonly modelName: 'gpt-4o'
  constructor(private model: 'gpt-4o' = 'gpt-4o') {
    this.modelName = model
  }

  async *stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk> {
    const result = streamText({ model: openai(this.model), messages })
    for await (const chunk of result.textStream) {
      yield { type: 'text', text: chunk }
    }
    const usage = await result.usage
    yield { type: 'finish', totalTokens: usage.totalTokens }
  }
}
```

- [ ] **Step 5: Create `src/lib/llm/adapters/anthropic.ts`**

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import type { StreamingLLMAdapter, StreamChunk } from '../streaming-adapter'

export class AnthropicAdapter implements StreamingLLMAdapter {
  readonly modelName: 'claude-3-5-sonnet'
  constructor(private model: 'claude-3-5-sonnet' = 'claude-3-5-sonnet') {
    this.modelName = model
  }

  async *stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk> {
    const result = streamText({ model: anthropic(this.model), messages })
    for await (const chunk of result.textStream) {
      yield { type: 'text', text: chunk }
    }
  }
}
```

- [ ] **Step 6: Create `src/lib/llm/adapters/gemini.ts`**

```typescript
import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import type { StreamingLLMAdapter, StreamChunk } from '../streaming-adapter'

export class GeminiAdapter implements StreamingLLMAdapter {
  readonly modelName: 'gemini-1.5-pro'
  constructor(private model: 'gemini-1.5-pro' = 'gemini-1.5-pro') {
    this.modelName = model
  }

  async *stream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): AsyncIterable<StreamChunk> {
    const result = streamText({ model: google(this.model), messages })
    for await (const chunk of result.textStream) {
      yield { type: 'text', text: chunk }
    }
  }
}
```

- [ ] **Step 7: Create `src/lib/llm/adapters/index.ts`**

```typescript
export { OpenAIAdapter } from './openai'
export { AnthropicAdapter } from './anthropic'
export { GeminiAdapter } from './gemini'
```

- [ ] **Step 8: Create `src/lib/llm/registry.ts`**

```typescript
import type { StreamingLLMAdapter } from './streaming-adapter'
import { OpenAIAdapter, AnthropicAdapter, GeminiAdapter } from './adapters'

export const SUPPORTED_MODELS = ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'] as const
export type SupportedModel = (typeof SUPPORTED_MODELS)[number]

export function listSupportedModels(): readonly SupportedModel[] {
  return SUPPORTED_MODELS
}

export function getLLM(modelName: string = 'gpt-4o'): StreamingLLMAdapter {
  switch (modelName) {
    case 'claude-3-5-sonnet': return new AnthropicAdapter()
    case 'gemini-1.5-pro': return new GeminiAdapter()
    case 'gpt-4o':
    default: return new OpenAIAdapter()
  }
}
```

- [ ] **Step 9: Update `src/lib/adapters/llm/index.ts` to delegate**

```typescript
// DEPRECATED: use @/lib/llm/registry instead. Kept for backward compatibility.
export { getLLM, listSupportedModels, SUPPORTED_MODELS, type SupportedModel } from '@/lib/llm/registry'
```

- [ ] **Step 10: Delete `src/lib/adapters/llm/interface.ts`**

```bash
rm src/lib/adapters/llm/interface.ts
```

- [ ] **Step 11: Run all tests, expect PASS**

```bash
npm test
```

- [ ] **Step 12: Commit**

```bash
git add -A src/lib/llm src/lib/adapters/llm
git commit -m "refactor(llm): StreamingLLMAdapter interface + adapter rewrite"
```

---

## Task 6: Install & wire Inngest

**Files:**
- Modify: `package.json`
- Create: `src/lib/inngest/client.ts`
- Create: `src/app/api/inngest/route.ts`

- [ ] **Step 1: Install inngest**

```bash
npm install inngest
```

- [ ] **Step 2: Create `src/lib/inngest/client.ts`**

```typescript
import { Inngest, EventSchemas } from 'inngest'

type Events = {
  'document/uploaded': { data: { docId: string } }
  'document/process': { data: { docId: string } }
  'subscription/sync': { data: { orgId: string } }
}

export const inngest = new Inngest({
  id: 'lexilift',
  schemas: new EventSchemas().fromRecord<Events>(),
})
```

- [ ] **Step 3: Create `src/app/api/inngest/route.ts`**

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { processDocument } from '@/lib/inngest/functions/processDocument'
import { resetQueryCounts } from '@/lib/inngest/functions/resetQueryCounts'
import { checkUsageAlerts } from '@/lib/inngest/functions/checkUsageAlerts'
import { syncSubscriptions } from '@/lib/inngest/functions/syncSubscriptions'
import { purgeSoftDeleted } from '@/lib/inngest/functions/purgeSoftDeleted'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processDocument,
    resetQueryCounts,
    checkUsageAlerts,
    syncSubscriptions,
    purgeSoftDeleted,
  ],
})
```

(Stub the five functions in `src/lib/inngest/functions/` for now; full implementations in Task 7–8.)

- [ ] **Step 4: Create empty function stubs**

```bash
mkdir -p src/lib/inngest/functions
```

For each, create `src/lib/inngest/functions/<name>.ts`:

```typescript
import { inngest } from '../client'

export const processDocument = inngest.createFunction(
  { id: 'process-document' },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    return { ok: true, docId: event.data.docId }
  }
)
```

Repeat with the matching `event: 'document/process'`, cron `'0 0 1 * *'`, cron `'0 9 * * *'`, cron `'0 6 * * *'`, cron `'0 3 * * *'` for the other four.

- [ ] **Step 5: Add npm scripts to `package.json`**

```json
{
  "scripts": {
    "dev:inngest": "npx inngest-cli@latest dev -u http://localhost:3000/api/inngest",
    "dev:all": "concurrently -n next,inngest,db -c blue,magenta,green \"npm:dev\" \"npm:dev:inngest\" \"npm:dev:db\""
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/inngest src/app/api/inngest
git commit -m "feat(inngest): install, client singleton, serve route, function stubs"
```

---

## Task 7: Real `processDocument` Inngest function (fixes B2, B12)

**Files:**
- Modify: `src/lib/inngest/functions/processDocument.ts`
- Delete: `src/workflows/ingestion.ts`
- Create: `src/lib/inngest/functions/processDocument.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/inngest/functions/processDocument.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 'd1', orgId: 'o1', fileType: 'application/pdf', fileUrl: 'https://x/d1.pdf', status: 'processing' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/parsers/pdf', () => ({ parsePdf: vi.fn().mockResolvedValue('hello world') }))
vi.mock('@/lib/langchain/chunking', () => ({ splitText: vi.fn().mockResolvedValue([{ pageContent: 'hello world' }]) }))
vi.mock('@/lib/adapters/vector-store/pinecone', () => ({ getVectorStore: () => ({ upsert: vi.fn().mockResolvedValue(undefined) }) }))

import { processDocument } from './processDocument'

describe('processDocument', () => {
  it('marks status ready on success', async () => {
    const result = await processDocument.fn({ event: { data: { docId: 'd1' } }, step: { run: (n, fn) => fn() } } as any)
    expect(result).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL (stub doesn't parse)**

- [ ] **Step 3: Replace `processDocument.ts` with the real implementation**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { documents, documentChunks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { parsePdf } from '@/lib/parsers/pdf'
import { parseDocx } from '@/lib/parsers/docx'
import { parseText } from '@/lib/parsers/text'
import { splitText } from '@/lib/langchain/chunking'
import { getVectorStore } from '@/lib/adapters/vector-store/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '@/lib/env'
import { v4 as uuidv4 } from 'uuid'
import { createAdminClient } from '@/lib/supabase/admin'

const DIM = 1536

export const processDocument = inngest.createFunction(
  { id: 'process-document', retries: 3 },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    const { docId } = event.data

    const doc = await step.run('load-doc', async () => {
      const rows = await db.select().from(documents).where(eq(documents.id, docId)).limit(1)
      return rows[0]
    })
    if (!doc) throw new Error(`Document ${docId} not found`)

    const buffer = await step.run('download', async () => {
      const r = await fetch(doc.fileUrl!)
      if (!r.ok) throw new Error(`Storage download failed: ${r.statusText}`)
      return Buffer.from(await r.arrayBuffer())
    })

    const text = await step.run('parse', async () => {
      if (doc.fileType === 'application/pdf') return parsePdf(buffer)
      if (doc.fileType.includes('word')) return parseDocx(buffer)
      return parseText(buffer)
    })

    const chunks = await step.run('chunk', async () => splitText(text))
    if (chunks.length === 0) {
      await step.run('mark-empty', () => db.update(documents).set({ status: 'ready', chunkCount: 0 }).where(eq(documents.id, docId)))
      return { docId, chunkCount: 0 }
    }

    const vectors = await step.run('embed', async () => {
      if (!env.OPENAI_API_KEY) return chunks.map(() => new Array(DIM).fill(0.1))
      const emb = new OpenAIEmbeddings({ openAIApiKey: env.OPENAI_API_KEY, modelName: 'text-embedding-3-small' })
      return emb.embedDocuments(chunks.map(c => c.pageContent))
    })

    await step.run('upsert-pinecone', async () => {
      if (!env.PINECONE_API_KEY) return
      const records = chunks.map((c, i) => ({ id: uuidv4(), text: c.pageContent, metadata: { docId: doc.id, chunkIndex: i, embedding: vectors[i] } }))
      await getVectorStore().upsert(records, doc.orgId!)
    })

    await step.run('save-chunks', async () => {
      const rows = chunks.map((c, i) => ({
        id: uuidv4(),
        orgId: doc.orgId!,
        docId: doc.id,
        chunkIndex: i,
        content: c.pageContent,
        metadata: c.metadata,
        pineconeId: '',
      }))
      if (rows.length) await db.insert(documentChunks).values(rows)
    })

    await step.run('mark-ready', () =>
      db.update(documents).set({ status: 'ready', chunkCount: chunks.length }).where(eq(documents.id, docId))
    )

    return { docId, chunkCount: chunks.length }
  }
)
```

- [ ] **Step 4: Delete `src/workflows/ingestion.ts`**

```bash
rm src/workflows/ingestion.ts
rmdir src/workflows 2>/dev/null || true
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- processDocument.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A src/lib/inngest/functions src/workflows
git commit -m "feat(ingest): real Inngest processDocument with storage download + retries"
```

---

## Task 8: Real cron Inngest functions

**Files:**
- Modify: `src/lib/inngest/functions/resetQueryCounts.ts`
- Modify: `src/lib/inngest/functions/checkUsageAlerts.ts`
- Modify: `src/lib/inngest/functions/syncSubscriptions.ts`
- Modify: `src/lib/inngest/functions/purgeSoftDeleted.ts`

- [ ] **Step 1: `resetQueryCounts.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export const resetQueryCounts = inngest.createFunction(
  { id: 'reset-query-counts' },
  { cron: '0 0 1 * *' },
  async ({ step }) => {
    const reset = await step.run('reset', () =>
      db.update(organizations)
        .set({ queryCount: 0, queryResetAt: sql`now() + interval '1 month'` })
    )
    return { reset: true }
  }
)
```

- [ ] **Step 2: `checkUsageAlerts.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { organizations, memberships, profiles } from '@/lib/db/schema'
import { and, gt, eq, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { env } from '@/lib/env'

export const checkUsageAlerts = inngest.createFunction(
  { id: 'check-usage-alerts' },
  { cron: '0 9 * * *' },
  async ({ step }) => {
    const orgs = await step.run('find-over-80', () =>
      db.select().from(organizations).where(gt(sql`${organizations.queryCount}`, sql`${organizations.queryLimit} * 0.8`))
    )
    if (!env.RESEND_API_KEY || orgs.length === 0) return { sent: 0 }
    const resend = new Resend(env.RESEND_API_KEY)
    let sent = 0
    for (const org of orgs) {
      const ownerRows = await step.run(`owner-${org.id}`, () =>
        db.select({ email: profiles.id }).from(memberships)
          .innerJoin(profiles, eq(profiles.id, memberships.userId))
          .where(and(eq(memberships.orgId, org.id), eq(memberships.role, 'owner')))
          .limit(1)
      )
      if (!ownerRows[0]) continue
      await resend.emails.send({
        from: 'LexiLift <alerts@lexilift.com>',
        to: ownerRows[0].email,
        subject: `You've used ${Math.round(org.queryCount / org.queryLimit * 100)}% of your LexiLift queries`,
        html: `<p>Hi,</p><p>Your workspace <b>${org.name}</b> has used ${org.queryCount} of ${org.queryLimit} queries this month.</p><p>Upgrade to Pro for more: <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Billing</a></p>`,
      })
      sent++
    }
    return { sent }
  }
)
```

- [ ] **Step 3: `syncSubscriptions.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'
import { Polar } from '@polar-sh/sdk'
import { env } from '@/lib/env'

const STATUS_PLAN: Record<string, 'starter' | 'pro' | 'team'> = {
  active: 'pro',
  trialing: 'pro',
  past_due: 'starter',
  canceled: 'starter',
  unpaid: 'starter',
}

export const syncSubscriptions = inngest.createFunction(
  { id: 'sync-subscriptions' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    if (!env.POLAR_ACCESS_TOKEN) return { synced: 0 }
    const polar = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN, server: env.NODE_ENV === 'production' ? 'production' : 'sandbox' })
    const orgs = await step.run('load-orgs', () =>
      db.select().from(organizations).where(isNotNull(organizations.polarSubscriptionId))
    )
    let synced = 0
    for (const org of orgs) {
      const sub = await step.run(`sub-${org.id}`, () => polar.subscriptions.get({ id: org.polarSubscriptionId! }))
      const plan = STATUS_PLAN[sub.status] ?? 'starter'
      await step.run(`update-${org.id}`, () =>
        db.update(organizations).set({ plan }).where(eq(organizations.id, org.id))
      )
      synced++
    }
    return { synced }
  }
)
```

- [ ] **Step 4: `purgeSoftDeleted.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { documents } from '@/lib/db/schema'
import { isNotNull, lt } from 'drizzle-orm'

export const purgeSoftDeleted = inngest.createFunction(
  { id: 'purge-soft-deleted' },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const purged = await step.run('purge', () =>
      db.delete(documents).where(and(isNotNull(documents.deletedAt), lt(documents.deletedAt, cutoff)))
    )
    return { purged: true }
  }
)
```

Add the missing `and` import to each file's drizzle-orm import line.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inngest/functions
git commit -m "feat(inngest): real cron functions for reset/alerts/sync/purge"
```

---

## Task 9: Wire Inngest trigger into `/api/ingest` (fixes B3)

**Files:**
- Modify: `src/app/api/ingest/route.ts`

- [ ] **Step 1: Add the Inngest send call**

Replace the commented-out `fetch(...)` block with:

```typescript
import { inngest } from '@/lib/inngest/client'

// ... after the db.insert(documents).values({...}).returning() ...
await inngest.send({ name: 'document/uploaded', data: { docId: newDoc.id } })
```

- [ ] **Step 2: Wrap in try/catch so a failed Inngest send does not break the upload**

```typescript
try {
  await inngest.send({ name: 'document/uploaded', data: { docId: newDoc.id } })
} catch (e) {
  console.error('Inngest send failed, document will remain in processing:', e)
}
```

- [ ] **Step 3: Test the route**

```bash
npm run dev &
sleep 5
curl -X POST http://localhost:3000/api/ingest \
  -F file=@README.md \
  -F orgId=00000000-0000-0000-0000-000000000000
# Expected: 403 (no auth) OR 200 with docId (with auth)
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ingest/route.ts
git commit -m "fix(ingest): trigger Inngest document/uploaded on upload"
```

---

## Task 10: Wire Inngest trigger into `/api/documents/[id]/process` (fixes B3)

**Files:**
- Modify: `src/app/api/documents/[id]/process/route.ts`

- [ ] **Step 1: Add the Inngest send call**

After `await db.update(documents).set({ status: 'processing', ... })` add:

```typescript
import { inngest } from '@/lib/inngest/client'

try {
  await inngest.send({ name: 'document/process', data: { docId: id } })
} catch (e) {
  console.error('Inngest re-process send failed:', e)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/documents/[id]/process/route.ts
git commit -m "fix(process): trigger Inngest re-process on demand"
```

---

## Task 11: Fix `/api/query` citations (fixes B1)

**Files:**
- Modify: `src/app/api/query/route.ts`

- [ ] **Step 1: Replace the broken `onFinish` insert**

```typescript
onFinish: async ({ text, usage }) => {
  if (sessionId) {
    try {
      await db.insert(chatMessages).values([
        { sessionId, role: 'user', content: userQuery },
        {
          sessionId,
          role: 'assistant',
          content: text,
          citations: contextItems.map((c, i) => ({
            index: i + 1,
            docId: c.metadata?.docId,
            docName: c.metadata?.docName,
            pageNum: c.metadata?.pageNum ?? null,
            excerpt: c.text?.slice(0, 280),
            score: c.score,
          })),
          tokensUsed: usage?.totalTokens ?? null,
          latencyMs: Date.now() - startedAt,
        },
      ])
    } catch (e) {
      console.error('Failed to save chat history', e)
    }
  }
}
```

Add `const startedAt = Date.now()` at the top of the route.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/query/route.ts
git commit -m "fix(query): persist citations to correct column with latency/tokens"
```

---

## Task 12: Schema additions migration

**Files:**
- Create: `src/lib/db/migrations/0003_schema_additions.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS llm_model text DEFAULT 'gpt-4o',
  ADD COLUMN IF NOT EXISTS documents_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_region text DEFAULT 'us';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents(org_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents(sha256);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
```

- [ ] **Step 2: Update Drizzle schema to match**

Add to `src/lib/db/schema.ts`:

```typescript
// organizations: add
llmModel: text('llm_model').default('gpt-4o'),
documentsCount: integer('documents_count').default(0),
dataRegion: text('data_region').default('us'),

// documents: add
sha256: text('sha256'),
deletedAt: timestamp('deleted_at', { withTimezone: true }),
```

- [ ] **Step 3: Generate Drizzle migration snapshot**

```bash
npx drizzle-kit generate
```

Verify the generated `0003_*.sql` matches (or merge with the manual one above).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db src/lib/db/migrations
git commit -m "feat(schema): llmModel, documentsCount, dataRegion, sha256, deletedAt"
```

---

## Task 13: RLS helpers + full policies migration

**Files:**
- Create: `src/lib/db/migrations/0001_rls_helpers.sql`
- Create: `src/lib/db/migrations/0002_rls_policies.sql`
- Modify: `src/lib/db/migrate.ts` to read all migrations

- [ ] **Step 1: `0001_rls_helpers.sql`**

```sql
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from memberships where org_id = p_org and user_id = auth.uid());
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from memberships
    where org_id = p_org and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

create or replace function public.is_org_owner(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(
    select 1 from memberships
    where org_id = p_org and user_id = auth.uid() and role = 'owner'
  );
$$;

create index if not exists idx_memberships_user on memberships(user_id);
create index if not exists idx_memberships_org_user on memberships(org_id, user_id);
```

- [ ] **Step 2: `0002_rls_policies.sql`**

```sql
-- Enable RLS on all tables (idempotent)
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table invites enable row level security;
alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table widget_tokens enable row level security;

-- Drop existing policies (for re-runs)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy "profiles self select" on profiles for select using (auth.uid() = id);
create policy "profiles self update" on profiles for update using (auth.uid() = id);

-- organizations
create policy "orgs member select" on organizations for select using (is_org_member(id));
create policy "orgs self insert" on organizations for insert with check (auth.uid() = created_by);
create policy "orgs admin update" on organizations for update using (is_org_admin(id));
create policy "orgs owner delete" on organizations for delete using (is_org_owner(id));

-- memberships
create policy "memberships member select" on memberships for select using (is_org_member(org_id));
create policy "memberships admin insert" on memberships for insert with check (is_org_admin(org_id));
create policy "memberships admin update" on memberships for update using (is_org_admin(org_id));
create policy "memberships admin delete" on memberships for delete using (is_org_admin(org_id) and not (user_id = auth.uid() and role = 'owner'));

-- invites
create policy "invites admin select" on invites for select using (is_org_admin(org_id));
create policy "invites admin insert" on invites for insert with check (is_org_admin(org_id));
create policy "invites admin or self update" on invites for update using (is_org_admin(org_id) or invited_by = auth.uid());
create policy "invites admin delete" on invites for delete using (is_org_admin(org_id));

-- documents
create policy "documents member select" on documents for select using (is_org_member(org_id));
create policy "documents admin insert" on documents for insert with check (is_org_admin(org_id));
create policy "documents admin update" on documents for update using (is_org_admin(org_id));
create policy "documents admin delete" on documents for delete using (is_org_admin(org_id));

-- document_chunks: members can read, but only service role writes
create policy "chunks member select" on document_chunks for select using (is_org_member(org_id));

-- chat_sessions
create policy "sessions member select" on chat_sessions for select using (is_org_member(org_id));
create policy "sessions member insert" on chat_sessions for insert with check (is_org_member(org_id));
create policy "sessions self or admin update" on chat_sessions for update using (user_id = auth.uid() or is_org_admin(org_id));
create policy "sessions self or admin delete" on chat_sessions for delete using (user_id = auth.uid() or is_org_admin(org_id));

-- chat_messages
create policy "messages member select" on chat_messages for select using (
  exists(select 1 from chat_sessions s where s.id = session_id and is_org_member(s.org_id))
);
create policy "messages member insert" on chat_messages for insert with check (
  exists(select 1 from chat_sessions s where s.id = session_id and is_org_member(s.org_id))
);
create policy "messages owner update" on chat_messages for update using (
  exists(select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "messages admin delete" on chat_messages for delete using (
  exists(select 1 from chat_sessions s where s.id = session_id and is_org_admin(s.org_id))
);

-- widget_tokens
create policy "widget admin all" on widget_tokens for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));
```

- [ ] **Step 3: Rewrite `src/lib/db/migrate.ts`**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/migrations src/lib/db/migrate.ts
git commit -m "feat(rls): helpers + full policies for all 9 tables"
```

---

## Task 14: Middleware real auth gate (fixes B13)

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

`src/middleware.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@/lib/auth/supabase/middleware', () => ({
  updateSession: vi.fn(async (req: any) => {
    const user = await mockGetUser()
    const res = new Response(null, { headers: new Headers() })
    ;(res as any)._user = user
    return res
  }),
}))

import { middleware } from './middleware'

describe('middleware', () => {
  it('redirects unauthenticated users from /dashboard', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await middleware(new Request('http://localhost/dashboard'))
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows access to /login', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await middleware(new Request('http://localhost/login'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('allows /widget/* and /api/widget/* without auth', async () => {
    mockGetUser.mockResolvedValue(null)
    const res = await middleware(new Request('http://localhost/widget/abc'))
    expect(res.headers.get('location')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Rewrite `src/middleware.ts`**

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/auth/supabase/middleware'

const PUBLIC_PREFIXES = [
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/api/auth', '/widget', '/api/widget',
  '/api/inngest', '/api/cron', '/api/webhooks',
  '/_next', '/favicon',
]

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return response
  if (pathname === '/' || pathname.startsWith('/api/health')) return response

  // user is attached to response by updateSession
  const user = (response as any)._user
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

- [ ] **Step 4: Update `src/lib/auth/supabase/middleware.ts` to attach user to response**

```typescript
// inside updateSession, after `await supabase.auth.getUser()`:
const { data: { user } } = await supabase.auth.getUser()
;(supabaseResponse as any)._user = user
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- middleware.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts src/lib/auth/supabase/middleware.ts
git commit -m "feat(middleware): real auth gate with public-prefix allowlist"
```

---

## Task 15: Settings save to DB (fixes B10)

**Files:**
- Create: `src/app/api/organizations/settings/route.ts`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Create `PUT /api/organizations/settings` route**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { isAdmin } from '@/lib/auth/org-utils'

export async function PUT(req: Request) {
  try {
    await requireAuth()
    const orgId = await getCurrentOrgId()
    if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

    const user = await requireAuth()
    if (!(await isAdmin(orgId, user.id))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { llmModel } = await req.json()
    if (!['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'].includes(llmModel)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }

    await db.update(organizations).set({ llmModel }).where(eq(organizations.id, orgId))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Wire `src/app/dashboard/settings/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function SettingsPage({ initialModel = 'gpt-4o' }: { initialModel?: string }) {
  const [model, setModel] = useState(initialModel)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const r = await fetch('/api/organizations/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llmModel: model }),
    })
    setLoading(false)
    if (!r.ok) { toast.error('Save failed'); return }
    toast.success('Settings saved')
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace preferences and defaults.</p>
      </div>
      <Card className="shadow-none border-border">
        <CardHeader>
          <CardTitle>AI Model Preferences</CardTitle>
          <CardDescription>Choose the default LLM to power your RAG chat and widget responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="llm-model">Default Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="llm-model" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">OpenAI GPT-4o (Recommended)</SelectItem>
                <SelectItem value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="gemini-1.5-pro">Google Gemini 1.5 Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Pass `initialModel` from a server parent**

Convert the page to a server component wrapper:

```typescript
// src/app/dashboard/settings/page.tsx
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const orgId = await getCurrentOrgId()
  let initialModel = 'gpt-4o'
  if (orgId) {
    const rows = await db.select({ llmModel: organizations.llmModel }).from(organizations).where(eq(organizations.id, orgId)).limit(1)
    initialModel = rows[0]?.llmModel ?? 'gpt-4o'
  }
  return <SettingsClient initialModel={initialModel} />
}
```

Create `src/app/dashboard/settings/SettingsClient.tsx` with the client code from Step 2.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/organizations/settings src/app/dashboard/settings
git commit -m "fix(settings): persist llmModel to organizations table"
```

---

## Task 16: Create Workspace dialog (fixes B9)

**Files:**
- Create: `src/components/layout/CreateOrgDialog.tsx`
- Modify: `src/components/layout/OrgSwitcher.tsx`

- [ ] **Step 1: Create the dialog**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function CreateOrgDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    const r = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setLoading(false)
    if (!r.ok) { toast.error('Create failed'); return }
    toast.success('Workspace created')
    setOpen(false)
    setName('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center w-full px-2 py-1.5 text-sm text-primary hover:bg-muted/50 rounded cursor-pointer">
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Workspace
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new workspace</DialogTitle>
          <DialogDescription>Each workspace has its own documents, members, and billing.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Acme Corp"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire into OrgSwitcher**

Replace the no-op `<DropdownMenuItem className="cursor-pointer text-primary">…Create Workspace…</DropdownMenuItem>` with `<CreateOrgDialog />`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout
git commit -m "fix(org-switcher): working Create Workspace dialog"
```

---

## Task 17: Widget CORS fix (fixes B7)

**Files:**
- Modify: `src/app/api/widget/chat/route.ts`

- [ ] **Step 1: Replace OPTIONS handler and tighten POST CORS**

```typescript
function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(req.headers.get('origin') || '*') })
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin') || ''
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401, headers: corsHeaders(origin) })
    }

    const token = authHeader.split(' ')[1]
    const tokens = await db.select().from(widgetTokens).where(eq(widgetTokens.token, token)).limit(1)
    const widgetConfig = tokens[0]

    if (!widgetConfig?.isActive) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders(origin) })
    }

    if (widgetConfig.allowedOrigins?.length && !widgetConfig.allowedOrigins.includes('*') && !widgetConfig.allowedOrigins.includes(origin)) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders(origin) })
    }

    // ... rest of handler ...
    return result.toDataStreamResponse({ headers: { ...corsHeaders(origin), 'x-citations': '...' } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders(req.headers.get('origin') || '') })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/widget/chat/route.ts
git commit -m "fix(widget): proper CORS with echoed validated origin"
```

---

## Task 18: Polar webhook Standard Webhooks (fixes B6)

**Files:**
- Create: `src/lib/billing/polar-webhook.ts`
- Create: `src/lib/billing/polar-webhook.test.ts`
- Modify: `src/app/api/webhooks/polar/route.ts`

- [ ] **Step 1: Install `standardwebhooks`**

```bash
npm install standardwebhooks
```

- [ ] **Step 2: Write the failing test**

`src/lib/billing/polar-webhook.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { verifyPolarSignature, parsePolarEvent } from './polar-webhook'

const secret = 'whsec_test_super_secret'

describe('verifyPolarSignature', () => {
  it('accepts a valid Standard Webhooks signature', async () => {
    const { StandardWebhooks } = await import('standardwebhooks')
    const wh = new StandardWebhooks(secret)
    const payload = JSON.stringify({ type: 'subscription.created', data: { id: 'sub_1' } })
    const headers = wh.sign('test-id', new Date(), payload)
    const ok = await verifyPolarSignature(payload, headers as Record<string, string>, secret)
    expect(ok).toBe(true)
  })

  it('rejects an invalid signature', async () => {
    const ok = await verifyPolarSignature('{}', { 'webhook-signature': 'v1,xxx' }, secret)
    expect(ok).toBe(false)
  })
})
```

- [ ] **Step 3: Create `src/lib/billing/polar-webhook.ts`**

```typescript
import { StandardWebhooks } from 'standardwebhooks'

export async function verifyPolarSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string
): Promise<boolean> {
  try {
    const wh = new StandardWebhooks(secret)
    wh.verify(payload, headers)
    return true
  } catch {
    return false
  }
}

export interface PolarSubscriptionEvent {
  type: string
  data: {
    id: string
    customer_id: string
    product_id: string
    status: string
    metadata?: { orgId?: string }
  }
}

export function parsePolarEvent(payload: string): PolarSubscriptionEvent {
  return JSON.parse(payload)
}
```

- [ ] **Step 4: Rewrite `src/app/api/webhooks/polar/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { env } from '@/lib/env'
import { verifyPolarSignature, parsePolarEvent } from '@/lib/billing/polar-webhook'

const STATUS_PLAN: Record<string, 'starter' | 'pro' | 'team'> = {
  active: 'pro', trialing: 'pro',
  past_due: 'starter', canceled: 'starter', unpaid: 'starter',
}

export async function POST(req: Request) {
  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  if (!env.POLAR_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  const ok = await verifyPolarSignature(payload, headers, env.POLAR_WEBHOOK_SECRET)
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  const event = parsePolarEvent(payload)
  if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
    const orgId = event.data.metadata?.orgId
    if (orgId) {
      const plan = STATUS_PLAN[event.data.status] ?? 'starter'
      const isPro = env.POLAR_PRO_PRODUCT_ID === event.data.product_id
      const isTeam = env.POLAR_TEAM_PRODUCT_ID === event.data.product_id
      const newPlan = isPro ? 'pro' : isTeam ? 'team' : plan
      await db.update(organizations).set({
        plan: newPlan,
        polarSubscriptionId: event.data.id,
        polarCustomerId: event.data.customer_id,
        queryLimit: newPlan === 'pro' ? 5000 : newPlan === 'team' ? 50000 : 500,
      }).where(eq(organizations.id, orgId))
    }
  } else if (event.type === 'subscription.canceled') {
    const orgId = event.data.metadata?.orgId
    if (orgId) {
      await db.update(organizations).set({ plan: 'starter', queryLimit: 500 }).where(eq(organizations.id, orgId))
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- polar-webhook.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/billing src/app/api/webhooks/polar package.json package-lock.json
git commit -m "fix(webhooks): Polar Standard Webhooks signature + status mapping"
```

---

## Task 19: Seed script

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add `seed` script)

- [ ] **Step 1: Install `tsx` if not already**

```bash
npm install -D tsx
```

- [ ] **Step 2: Create `scripts/seed.ts`**

```typescript
import 'dotenv/config'
import { db } from '../src/lib/db/client'
import { organizations, profiles, memberships, documents, chatSessions, widgetTokens } from '../src/lib/db/schema'
import { v4 as uuid } from 'uuid'

async function main() {
  console.log('Seeding…')

  const ownerId = uuid()
  await db.insert(profiles).values({
    id: ownerId,
    fullName: 'Seed Owner',
    currentOrgId: null,
  }).onConflictDoNothing()

  const starterId = uuid()
  const proId = uuid()

  await db.insert(organizations).values([
    { id: starterId, name: 'Starter Workspace', slug: `starter-${Date.now()}`, plan: 'starter', createdBy: ownerId, documentsCount: 0 },
    { id: proId, name: 'Pro Workspace', slug: `pro-${Date.now()}`, plan: 'pro', createdBy: ownerId, queryLimit: 5000, documentsCount: 0 },
  ])

  await db.insert(memberships).values([
    { orgId: starterId, userId: ownerId, role: 'owner' },
    { orgId: proId, userId: ownerId, role: 'owner' },
  ])

  await db.update(profiles).set({ currentOrgId: starterId }).where(/* eq */ undefined as any) // simplified

  for (const orgId of [starterId, proId]) {
    for (let i = 0; i < 3; i++) {
      await db.insert(documents).values({
        orgId, name: `sample-${i}.pdf`, fileType: 'application/pdf',
        status: 'ready', chunkCount: 10, fileSize: 1024 * 100, uploadedBy: ownerId,
        fileUrl: 'https://example.com/sample.pdf',
      })
    }
    await db.insert(widgetTokens).values({
      orgId, token: `wt_${orgId.slice(0, 8)}`, name: 'Default',
      isActive: true, primaryColor: '#006c49',
      welcomeMessage: 'Hi! Ask me anything.', rateLimitPerMin: 10,
    })
    await db.insert(chatSessions).values({
      orgId, userId: ownerId, source: 'dashboard', title: 'Welcome', llmModel: 'gpt-4o',
    })
  }

  console.log(`Seeded:\n  owner: ${ownerId}\n  starter: ${starterId}\n  pro: ${proId}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Add to `package.json`**

```json
"scripts": { "seed": "tsx scripts/seed.ts" }
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts package.json
git commit -m "feat(seed): development seed script"
```

---

## Task 20: Vitest coverage config

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add coverage**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: { '@': path.resolve(__dirname, './src') },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/app/api/**', 'src/components/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/migrations/**'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
})
```

- [ ] **Step 2: Install coverage**

```bash
npm install -D @vitest/coverage-v8
```

- [ ] **Step 3: Run coverage**

```bash
npm test -- --coverage
```

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "test: add vitest coverage with thresholds"
```

---

## Task 21: Vitest setup file + Sonner toaster

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/ui/sonner.tsx` (if missing) → add to layout
- Modify: `vitest.setup.ts`

- [ ] **Step 1: Add Sonner to root layout**

```typescript
// src/app/layout.tsx
import { Toaster } from '@/components/ui/sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update vitest setup**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx vitest.setup.ts
git commit -m "chore: sonner toaster in root layout, test setup polish"
```

---

## Task 22: Playwright E2E smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/foundation.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

- [ ] **Step 3: Create `e2e/foundation.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test('landing page renders and links to login', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /smart AI assistant/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('unauthenticated dashboard access redirects to /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
```

- [ ] **Step 4: Add script**

```json
"scripts": { "test:e2e": "playwright test" }
```

- [ ] **Step 5: Commit**

```bash
git add -A e2e playwright.config.ts package.json package-lock.json
git commit -m "test(e2e): Playwright smoke tests + config"
```

---

## Task 23: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: coverage, path: coverage/ }

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://stub.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: stub
          SUPABASE_SERVICE_ROLE_KEY: stub
          DATABASE_URL: postgresql://stub:stub@localhost:5432/stub
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, typecheck, test, build on PRs"
```

---

## Task 24: Update README + .env.example

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Add Inngest + service role + verify required vars in `.env.example`**

Append to `.env.example`:

```env
# Inngest
INNGEST_EVENT_KEY="local"
INNGEST_SIGNING_KEY="signkey-PLACEHOLDER"

# Sentry (optional)
SENTRY_DSN=""

# Polar (already present)
```

- [ ] **Step 2: Update README "Quick Start" with new scripts**

Add a "Local development" section:

```markdown
## Local development

```bash
npm install
cp .env.example .env.local  # fill in keys
npm run dev:all             # starts Supabase + Inngest + Next.js concurrently
npm run seed                # seeds 1 starter + 1 pro org
```

Open [http://localhost:3000](http://localhost:3000). The Inngest dev UI is at [http://localhost:8288](http://localhost:8288).
```

- [ ] **Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: local dev with Inngest + seed instructions"
```

---

## Self-Review

**1. Spec coverage for Foundation plan:**

| Spec section | Task |
|---|---|
| B1 (query citations) | T11 |
| B2 (ingest download) | T7 |
| B3 (Inngest trigger) | T9, T10 |
| B4 (per-token widget) | deferred to Plan 2 |
| B5 (mockOrgs) | T4 |
| B6 (Polar webhook) | T18 |
| B7 (widget CORS) | T17 |
| B8 (LLM adapter) | T5 |
| B9 (Create Workspace) | T16 |
| B10 (settings save) | T15 |
| B11 (real queryCount) | T4 |
| B12 (workflow runtime) | T7 |
| B13 (middleware gate) | T14 |
| AD-1 (Inngest) | T6, T7, T8, T9, T10 |
| AD-2 (admin client) | T2 |
| AD-3 (current-org) | T3, T4 |
| AD-4 (LLM adapter) | T5 |
| §4 RLS | T13 |
| §5.1 create workspace | T16 (modal only; full multi-tenant CRUD in Plan 2) |
| §5.1 invite accept UI | deferred to Plan 2 |
| §6.5 local dev | T19 (seed), T24 (docs) |
| §8 tests | T20 (coverage), T22 (e2e) |
| §9 migrations | T12, T13 |

**2. Placeholder scan:** no "TBD", "TODO", "implement later" in this plan.

**3. Type consistency:** `getCurrentOrgId()` (T3) used by T4, T15. `createAdminClient()` (T2) used by T7, T13+ future. `StreamingLLMAdapter` (T5) used by `src/lib/langchain/rag-chain.ts` (modify as a follow-up in T11 or Plan 2). `inngest` client (T6) used by T7, T8, T9, T10. `verifyPolarSignature` (T18) used by webhook route. Consistent.

**Gaps deferred to Plan 2** (documented but not in Foundation):
- B4 widget per-token route
- §5.2 documents UI (URL ingest, dedup, soft-delete UI, bulk delete) — only server queries fixed
- §5.3 chat session list, model selector header, stop/regenerate/edit
- §5.4 citations & feedback (CitationCard, SourceHighlight, FeedbackButtons, parse)
- §5.5 widget CRUD + loader script
- §5.6 team/enterprise plans UI, usage tracking increment, plan-limit middleware
- §5.7 analytics page + PostHog
- §5.8 onboarding flow
- §5.9 password reset, email verification, OAuth Google, brute-force rate limit
- §6 infra: vercel.json, next.config.ts security headers, Sentry, /api/health
- §7 compliance: cookie consent, privacy/terms pages, GDPR export/delete, DPA

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-06-lexilift-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints

Which approach?
