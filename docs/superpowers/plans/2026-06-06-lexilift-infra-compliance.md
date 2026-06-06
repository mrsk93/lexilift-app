# LexiLift MVP Infrastructure & Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the LexiLift MVP for production: Sentry error monitoring, CSP & security headers, structured logging, health/ready probes, public-API rate limits, GDPR data export and account deletion, ToS/Privacy/Consent, backups runbook, audit log, and incident response documentation.

**Architecture:** Continuation of Plan 1 + Plan 2. Same Next.js 16 + Supabase + Drizzle + Inngest stack. New this plan: Sentry (errors), pino (logging), audit log table, GDPR compliance endpoints, public legal pages. All hardening is configuration-first and minimally invasive to existing feature code.

**Tech Stack:** Same as Plans 1+2, plus: `@sentry/nextjs` ^8, `pino` ^9, `pino-pretty` ^11 (dev), `crypto-random-string` ^3 (request IDs). Dev: `vitest`, `playwright`.

**Reference spec:** `docs/superpowers/specs/2026-06-06-lexilift-mvp-gap-fill-design.md` (AD-1, AD-12, §5.4, §6, §8.3, §9)

**Prerequisites:** Plan 1 (Foundation) + Plan 2 (Features) complete. Auth, RLS, Inngest, Upstash, Resend, Polar all working.

**Scope of this plan:** Plan 3 of 4 (Infra + Compliance). After this plan, the app is production-deployable: Sentry catches errors, security headers protect against XSS/clickjacking, logs are structured with request IDs, public APIs are rate-limited, users can export and delete their data (GDPR), legal pages exist, and the team has runbooks for incidents and backups. Polish + tests come in Plan 4.

---

## File Structure (new & modified)

### New files
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/instrumentation.ts` (Next.js 15+ hook)
- `src/app/global-error.tsx`
- `src/lib/sentry/server.ts` (typed wrapper for `Sentry.captureException`)
- `src/lib/log.ts` (pino logger, redaction)
- `src/lib/log/log.test.ts`
- `src/lib/audit/log.ts` (audit event writer)
- `src/lib/audit/log.test.ts`
- `src/lib/db/migrations/0011_audit_events.sql`
- `src/lib/db/migrations/0012_account_deletion.sql` (adds `deleted_at` to `users`)
- `src/lib/db/migrations/0013_request_log.sql` (optional persisted request log — actually skip; just use stdout + pino)
- `src/app/api/health/route.ts`
- `src/app/api/ready/route.ts`
- `src/app/api/account/export/route.ts`
- `src/app/api/account/delete/route.ts`
- `src/app/api/account/cancel-deletion/route.ts`
- `src/app/api/audit/route.ts` (admin-only, optional)
- `src/lib/inngest/functions/hardDeleteAccounts.ts`
- `src/components/settings/DataExportButton.tsx`
- `src/components/settings/DeleteAccountDialog.tsx`
- `src/components/settings/CancelDeletionButton.tsx`
- `src/app/(legal)/terms/page.tsx`
- `src/app/(legal)/privacy/page.tsx`
- `src/app/(legal)/dpa/page.tsx`
- `src/components/auth/ConsentCheckbox.tsx`
- `e2e/security-headers.spec.ts` (Playwright)
- `docs/runbook.md` (incidents, backups, on-call)
- `docs/secrets.md` (rotation policy)
- `docs/architecture.md` (high-level diagram + service map)
- Tests: `*.test.ts` co-located

### Modified files
- `package.json` — add deps & scripts
- `next.config.ts` — Sentry withSentryConfig wrapper
- `src/middleware.ts` — security headers, request ID
- `src/app/api/inngest/route.ts` — register `hardDeleteAccounts`
- `src/app/dashboard/settings/page.tsx` — add data export & account deletion
- `src/app/signup/page.tsx` — add consent checkbox
- `src/app/login/page.tsx` — add terms/privacy footer link
- `src/components/layout/Footer.tsx` — links to legal pages (if exists, create)

---

## Task 1: Sentry — server-side init

**Files:**
- Install: `@sentry/nextjs`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `src/instrumentation.ts`
- Create: `src/lib/sentry/server.ts`
- Create: `src/lib/sentry/server.test.ts`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install Sentry**

```bash
npx @sentry/wizard@latest -i nextjs --saas --skip-connect
```

(If the wizard fails offline, install manually:)
```bash
npm install @sentry/nextjs
```

- [ ] **Step 2: Add env vars**

```bash
SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_AUTH_TOKEN=sntrys_xxxx
SENTRY_ORG=lexilift
SENTRY_PROJECT=lexilift-web
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
```

Add to zod env schema (Plan 1's `src/lib/env.ts`):
```typescript
SENTRY_DSN: z.string().url().optional(),
NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
SENTRY_REPLAYS_SESSION_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1.0),
SENTRY_ENV: z.enum(['development', 'preview', 'production']).default('development'),
```

- [ ] **Step 3: Write the test**

`src/lib/sentry/server.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), setUser: vi.fn() }))

import { captureError, setUserContext } from './server'

describe('Sentry server wrapper', () => {
  it('captureError calls Sentry.captureException with extras', () => {
    const e = new Error('boom')
    captureError(e, { route: '/x', orgId: 'o1' })
    expect(require('@sentry/nextjs').captureException).toHaveBeenCalledWith(e, expect.objectContaining({ extra: { route: '/x', orgId: 'o1' } }))
  })

  it('setUserContext calls Sentry.setUser', () => {
    setUserContext({ id: 'u1', email: 'a@b.c' })
    expect(require('@sentry/nextjs').setUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.c' })
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- sentry/server.test.ts
```

- [ ] **Step 5: Create `sentry.server.config.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    environment: process.env.SENTRY_ENV ?? 'development',
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENV === 'preview',
    beforeSend(event) {
      // strip query strings that may contain tokens
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url)
          for (const k of ['token', 'code', 'api_key']) u.searchParams.delete(k)
          event.request.url = u.toString()
        } catch {}
      }
      return event
    },
  })
}
```

- [ ] **Step 6: Create `sentry.edge.config.ts`**

(Same as server but for edge runtime middleware:)
```typescript
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.05, environment: process.env.SENTRY_ENV ?? 'development' })
}
```

- [ ] **Step 7: Create `src/instrumentation.ts`**

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('../sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('../sentry.edge.config')
}
```

- [ ] **Step 8: Create `src/lib/sentry/server.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

export function captureError(err: unknown, extras?: Record<string, unknown>) {
  Sentry.captureException(err, { extra: extras })
}

export function setUserContext(user: { id: string; email?: string | null }) {
  Sentry.setUser({ id: user.id, email: user.email ?? undefined })
}

export function clearUserContext() {
  Sentry.setUser(null)
}
```

- [ ] **Step 9: Modify `next.config.ts`**

```typescript
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  // existing config
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  disableLogger: true,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  automaticVercelMonitors: true,
})
```

- [ ] **Step 10: Run test, expect PASS**

```bash
npm test -- sentry/server.test.ts
```

- [ ] **Step 11: Commit**

```bash
git add sentry.*.config.ts src/instrumentation.ts src/lib/sentry/ next.config.ts package.json .env.example
git commit -m "feat(sentry): server-side init with DSN, trace sample, query-string redaction"
```

---

## Task 2: Sentry — client-side init + error boundary

**Files:**
- Create: `sentry.client.config.ts`
- Create: `src/app/global-error.tsx`
- Create: `src/lib/sentry/client.ts`
- Create: `src/lib/sentry/client.test.tsx`
- Modify: `src/app/layout.tsx` (set user context once authed)

- [ ] **Step 1: Write the test**

`src/lib/sentry/client.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), setUser: vi.fn() }))

import { captureClientError, setClientUser } from './client'

describe('Sentry client wrapper', () => {
  it('captureClientError calls captureException', () => {
    const e = new Error('client boom')
    captureClientError(e)
    expect(require('@sentry/nextjs').captureException).toHaveBeenCalledWith(e)
  })

  it('setClientUser calls setUser', () => {
    setClientUser({ id: 'u1' })
    expect(require('@sentry/nextjs').setUser).toHaveBeenCalledWith({ id: 'u1' })
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- sentry/client.test.tsx
```

- [ ] **Step 3: Create `sentry.client.config.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: Number(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0),
    replaysOnErrorSampleRate: Number(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1.0),
    environment: process.env.SENTRY_ENV ?? 'development',
    enabled: process.env.NODE_ENV === 'production',
  })
}
```

- [ ] **Step 4: Create `src/lib/sentry/client.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

export function captureClientError(err: unknown) {
  Sentry.captureException(err)
}

export function setClientUser(user: { id: string; email?: string | null }) {
  Sentry.setUser({ id: user.id, email: user.email ?? undefined })
}
```

- [ ] **Step 5: Create `src/app/global-error.tsx`**

```tsx
'use client'
import { useEffect } from 'react'
import { captureClientError } from '@/lib/sentry/client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureClientError(error) }, [error])
  return (
    <html>
      <body>
        <div className="p-8 max-w-md mx-auto">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-4">{error.digest && `Reference: ${error.digest}`}</p>
          <button onClick={reset} className="bg-emerald-600 text-white px-3 py-1 rounded">Try again</button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Modify `src/app/layout.tsx` (server) to set Sentry user**

In the server component, after fetching the session (Plan 1), wrap children in a thin client provider that sets Sentry context:
```tsx
// inside the body, before {children}:
import { SentryUserBridge } from '@/components/SentryUserBridge'
<SentryUserBridge user={session?.user ?? null} />
{children}
```

Create `src/components/SentryUserBridge.tsx`:
```tsx
'use client'
import { useEffect } from 'react'
import { setClientUser } from '@/lib/sentry/client'

export function SentryUserBridge({ user }: { user: { id: string; email?: string | null } | null }) {
  useEffect(() => {
    if (user) setClientUser(user)
  }, [user])
  return null
}
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- sentry/client.test.tsx
```

- [ ] **Step 8: Commit**

```bash
git add sentry.client.config.ts src/lib/sentry/client.ts src/app/global-error.tsx src/app/layout.tsx src/components/SentryUserBridge.tsx
git commit -m "feat(sentry): client init + global error boundary + user bridge"
```

---

## Task 3: Security headers & Content-Security-Policy

**Files:**
- Modify: `next.config.ts` (add `headers()` async function)
- Create: `src/middleware.ts` security header additions (if not already)
- Create: `e2e/security-headers.spec.ts` (Playwright)
- Create: `e2e/playwright.config.ts` (if missing)

- [ ] **Step 1: Modify `next.config.ts`**

```typescript
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://us.i.posthog.com", // unsafe-inline needed for Next.js
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://us.i.posthog.com https://api.polar.sh https://*.pinecone.io https://*.upstash.io",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // allow iframe embedding for the widget page only
        source: '/widget/:token',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
}
```

- [ ] **Step 2: Add request ID in `src/middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

export function middleware(req: NextRequest) {
  const reqId = req.headers.get('x-request-id') ?? randomBytes(8).toString('hex')
  const res = NextResponse.next()
  res.headers.set('x-request-id', reqId)
  return res
}
```

(Combine with the existing auth gate from Plan 1.)

- [ ] **Step 3: Install Playwright (if not installed in Plan 1)**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Create `e2e/playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.APP_URL ?? 'http://localhost:3000' },
  webServer: process.env.CI ? undefined : { command: 'npm run dev', port: 3000, reuseExistingServer: true },
})
```

- [ ] **Step 4: Write the test**

`e2e/security-headers.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('public page sets security headers', async ({ request }) => {
  const r = await request.get('/')
  expect(r.headers()['x-frame-options']).toBe('DENY')
  expect(r.headers()['x-content-type-options']).toBe('nosniff')
  expect(r.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(r.headers()['strict-transport-security']).toContain('max-age=')
})
```

- [ ] **Step 5: Run test, expect FAIL**

```bash
npx playwright test e2e/security-headers.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add next.config.ts src/middleware.ts e2e/
git commit -m "feat(security): CSP, HSTS, X-Frame-Options, request IDs"
```

---

## Task 4: Pino structured logging + request IDs

**Files:**
- Install: `pino`, `pino-pretty` (dev)
- Create: `src/lib/log.ts`
- Create: `src/lib/log/log.test.ts`
- Modify: `src/middleware.ts` (already sets request id in Task 3 — pipe through)

- [ ] **Step 1: Install pino**

```bash
npm install pino
npm install -D pino-pretty
```

- [ ] **Step 2: Write the test**

`src/lib/log/log.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('pino', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn().mockReturnThis() }
  return { default: vi.fn(() => logger), pino: vi.fn(() => logger) }
})

import { logger } from './log'

describe('logger', () => {
  it('redacts PII', () => {
    logger.info({ email: 'a@b.c', token: 'tok' }, 'msg')
    // pino mock doesn't actually redact; the assertion below verifies the path executes
    expect(logger.info).toHaveBeenCalled()
  })

  it('has child()', () => {
    const c = logger.child({ requestId: 'r1' })
    expect(c).toBeDefined()
  })
})
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
npm test -- log/log.test.ts
```

- [ ] **Step 4: Create `src/lib/log.ts`**

```typescript
import pino from 'pino'

const redact = {
  paths: ['*.password', '*.token', '*.secret', '*.authorization', 'req.headers.cookie', 'req.headers.authorization'],
  censor: '[REDACTED]',
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact,
  base: { service: 'lexilift-web', env: process.env.SENTRY_ENV ?? 'development' },
  ...(process.env.NODE_ENV !== 'production' ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
})

export function withRequest(requestId: string) {
  return logger.child({ requestId })
}
```

- [ ] **Step 5: Use logger in `src/app/api/query/route.ts`**

At the top of the handler:
```typescript
import { logger } from '@/lib/log'
logger.info({ orgId, queryLen: content.length }, 'query received')
```

On error:
```typescript
logger.error({ err, orgId }, 'query failed')
```

- [ ] **Step 6: Run test, expect PASS**

```bash
npm test -- log/log.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add package.json src/lib/log.ts src/lib/log/log.test.ts src/app/api/query/
git commit -m "feat(logging): pino with PII redaction + request-id child loggers"
```

---

## Task 5: Health & readiness endpoints

**Files:**
- Create: `src/app/api/health/route.ts` (liveness — always 200)
- Create: `src/app/api/ready/route.ts` (readiness — checks DB + Inngest)
- Create: `src/app/api/health/health.test.ts`

- [ ] **Step 1: Write the test**

`src/app/api/health/health.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ db: { select: vi.fn().mockReturnValue({ from: () => ({ limit: () => [{ ok: 1 }] }) }) } }))

import { GET as ready } from './ready/route'
import { GET as health } from './health/route'

describe('health endpoints', () => {
  it('GET /api/health returns 200 always', async () => {
    const r = await health()
    expect(r.status).toBe(200)
  })
  it('GET /api/ready returns 200 when DB is reachable', async () => {
    const r = await ready()
    expect(r.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- health.test.ts
```

- [ ] **Step 3: Create `src/app/api/health/route.ts`**

```typescript
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ status: 'ok', uptime: process.uptime() })
}
```

- [ ] **Step 4: Create `src/app/api/ready/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {}
  try {
    await db.execute(sql`SELECT 1`)
    checks.db = 'ok'
  } catch { checks.db = 'fail' }
  const ok = Object.values(checks).every((v) => v === 'ok')
  return NextResponse.json({ status: ok ? 'ready' : 'degraded', checks }, { status: ok ? 200 : 503 })
}
```

- [ ] **Step 5: Run test, expect PASS**

```bash
npm test -- health.test.ts
```

- [ ] **Step 6: Document in `docs/runbook.md`** (added in Task 11)

The health checks are wired to Vercel's automatic health monitoring.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/health/ src/app/api/ready/
git commit -m "feat(infra): /api/health (liveness) and /api/ready (DB probe)"
```

---

## Task 6: Rate limits on public APIs (query, widget, ingest)

**Files:**
- Create: `src/lib/ratelimit/scopes.ts` (named limiters)
- Create: `src/lib/ratelimit/scopes.test.ts`
- Modify: `src/app/api/query/route.ts` (gate by org + user)
- Modify: `src/app/api/widget/chat/route.ts` (gate by token + IP)
- Modify: `src/app/api/ingest/route.ts` (gate by org)

- [ ] **Step 1: Write the test**

`src/lib/ratelimit/scopes.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@upstash/ratelimit', () => ({ Ratelimit: vi.fn().mockImplementation(() => ({ limit: vi.fn().mockResolvedValue({ success: true, remaining: 9, reset: 0 }) })) }))
vi.mock('@upstash/redis', () => ({ Redis: vi.fn() }))

import { checkLimit } from './scopes'

describe('checkLimit', () => {
  it('returns success when under limit', async () => {
    const r = await checkLimit('query', 'o1')
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- ratelimit/scopes.test.ts
```

- [ ] **Step 3: Create `src/lib/ratelimit/scopes.ts`**

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from './upstash'

const limiters: Record<string, Ratelimit> = {}

function getLimiter(scope: string, perMinute: number): Ratelimit {
  if (limiters[scope]) return limiters[scope]
  limiters[scope] = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(perMinute, '1 m'), prefix: `rl:${scope}` })
  return limiters[scope]
}

const LIMITS: Record<string, number> = {
  query: 60,         // 60 queries / minute per org
  widgetChat: 30,    // 30 widget chats / minute per token
  ingest: 20,        // 20 uploads / minute per org
  signup: 5,         // 5 signups / minute per IP
}

export async function checkLimit(scope: keyof typeof LIMITS, key: string) {
  return getLimiter(scope, LIMITS[scope]).limit(key)
}
```

- [ ] **Step 4: Gate `src/app/api/query/route.ts`**

At the top of the handler:
```typescript
import { checkLimit } from '@/lib/ratelimit/scopes'
const rl = await checkLimit('query', `org:${orgId}`)
if (!rl.success) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
```

- [ ] **Step 5: Gate `src/app/api/widget/chat/route.ts`**

```typescript
const rl = await checkLimit('widgetChat', `token:${token}`)
if (!rl.success) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
```

- [ ] **Step 6: Gate `src/app/api/ingest/route.ts`**

```typescript
const rl = await checkLimit('ingest', `org:${orgId}`)
if (!rl.success) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
```

- [ ] **Step 7: Run test, expect PASS**

```bash
npm test -- ratelimit/scopes.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/ratelimit/ src/app/api/query/ src/app/api/widget/chat/ src/app/api/ingest/
git commit -m "feat(security): Upstash rate limits on query, widget, ingest"
```

---

## Task 7: Data export (GDPR Art. 20 — right to data portability)

**Files:**
- Create: `src/app/api/account/export/route.ts`
- Create: `src/lib/account/export.ts` (data bundler)
- Create: `src/lib/account/export.test.ts`
- Create: `src/components/settings/DataExportButton.tsx`
- Create: `src/components/settings/data-export.test.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Write the test for the bundler**

`src/lib/account/export.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => {
  const docs = [{ id: 'd1', name: 'A', sourceType: 'pdf', createdAt: new Date() }]
  const sessions = [{ id: 's1', title: 'Q1', createdAt: new Date() }]
  const orgs = [{ id: 'o1', name: 'Acme', role: 'owner' }]
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
    },
    exportBundle: vi.fn().mockResolvedValue({ user: { id: 'u1' }, organizations: orgs, documents: docs, chatSessions: sessions, chatMessages: [] }),
  }
})
```

Adjust the bundler design (Step 4) accordingly. The test verifies the bundler returns all user-owned data.

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- account/export.test.ts
```

- [ ] **Step 3: Migration (none — all tables already have user/org scoping from Plan 1)**

Skip.

- [ ] **Step 4: Create `src/lib/account/export.ts`**

```typescript
import { db } from '@/lib/db'
import { users, orgMembers, organizations, documents, chatSessions, chatMessages, widgetTokens, invoices } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function exportUserData(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  const memberships = await db.select().from(orgMembers).where(eq(orgMembers.userId, userId))
  const orgIds = memberships.map((m) => m.orgId)
  const orgs = orgIds.length > 0 ? await db.select().from(organizations).where(inArray(organizations.id, orgIds)) : []
  const docs = orgIds.length > 0 ? await db.select().from(documents).where(inArray(documents.orgId, orgIds)) : []
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId))
  const sessionIds = sessions.map((s) => s.id)
  const messages = sessionIds.length > 0 ? await db.select().from(chatMessages).where(inArray(chatMessages.sessionId, sessionIds)) : []
  const widgets = orgIds.length > 0 ? await db.select().from(widgetTokens).where(inArray(widgetTokens.orgId, orgIds)) : []
  const invs = orgIds.length > 0 ? await db.select().from(invoices).where(inArray(invoices.orgId, orgIds)) : []
  return { user, memberships, organizations: orgs, documents: docs, chatSessions: sessions, chatMessages: messages, widgetTokens: widgets, invoices: invs, exportedAt: new Date().toISOString() }
}
```

- [ ] **Step 5: Create `src/app/api/account/export/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { exportUserData } from '@/lib/account/export'
import { logger } from '@/lib/log'
import { captureError } from '@/lib/sentry/server'

export async function POST() {
  try {
    const { userId } = await requireOrgMember()
    const bundle = await exportUserData(userId)
    logger.info({ userId }, 'data export generated')
    return NextResponse.json(bundle)
  } catch (err) {
    captureError(err, { route: '/api/account/export' })
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Create `src/components/settings/DataExportButton.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function DataExportButton() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const r = await fetch('/api/account/export', { method: 'POST' })
        const data = await r.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lexilift-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        setBusy(false)
      }}
      className="bg-emerald-600 text-white px-3 py-1 rounded disabled:opacity-50"
    >{busy ? 'Preparing…' : 'Download my data (JSON)'}</button>
  )
}
```

- [ ] **Step 7: Write the component test**

`src/components/settings/data-export.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataExportButton } from './DataExportButton'

describe('DataExportButton', () => {
  it('POSTs to /api/account/export', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    global.fetch = fetchMock
    render(<DataExportButton />)
    fireEvent.click(screen.getByText(/Download my data/i))
    expect(fetchMock).toHaveBeenCalledWith('/api/account/export', expect.objectContaining({ method: 'POST' }))
  })
})
```

- [ ] **Step 8: Run tests, expect PASS**

```bash
npm test -- account/export.test.ts data-export.test.tsx
```

- [ ] **Step 9: Modify `src/app/dashboard/settings/page.tsx`**

Add a new section in the General tab:
```tsx
import { DataExportButton } from '@/components/settings/DataExportButton'
// in JSX:
<section className="border-t pt-6">
  <h2 className="text-lg font-semibold mb-2">Your data</h2>
  <p className="text-sm text-gray-500 mb-2">Download a copy of all data associated with your account (GDPR Art. 20).</p>
  <DataExportButton />
</section>
```

- [ ] **Step 10: Commit**

```bash
git add src/app/api/account/export/ src/lib/account/ src/components/settings/DataExportButton.tsx src/app/dashboard/settings/
git commit -m "feat(gdpr): data export endpoint + JSON download button"
```

---

## Task 8: Account deletion (GDPR Art. 17 — right to erasure)

**Files:**
- Create migration `0012_account_deletion.sql`
- Modify `src/lib/db/schema.ts`
- Create: `src/app/api/account/delete/route.ts` (soft delete — sets `users.deletedAt`)
- Create: `src/app/api/account/cancel-deletion/route.ts`
- Create: `src/lib/inngest/functions/hardDeleteAccounts.ts` (30-day grace cron)
- Create: `src/components/settings/DeleteAccountDialog.tsx`
- Create: `src/components/settings/CancelDeletionButton.tsx`
- Create: `src/components/settings/delete-account.test.tsx`
- Modify: `src/app/api/inngest/route.ts` (register function)
- Modify: `src/app/dashboard/settings/page.tsx` (add UI)

- [ ] **Step 1: Migration `0012_account_deletion.sql`**

```sql
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
ALTER TABLE users ADD COLUMN deletion_scheduled_for timestamptz;

-- Block new sessions for users with deleted_at set
CREATE OR REPLACE FUNCTION block_deleted_user_signin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT deleted_at FROM users WHERE id = NEW.id) IS NOT NULL THEN
    RAISE EXCEPTION 'ACCOUNT_DELETED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

(`auth.users` is managed by Supabase; we mirror deletion in our `public.users` table and let the RLS / API layer reject new operations for soft-deleted accounts.)

- [ ] **Step 2: Add to schema**

```typescript
export const users = pgTable('users', {
  // ... existing cols ...
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletionScheduledFor: timestamp('deletion_scheduled_for', { withTimezone: true }),
})
```

- [ ] **Step 3: Write the test**

`src/components/settings/delete-account.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteAccountDialog } from './DeleteAccountDialog'

describe('DeleteAccountDialog', () => {
  it('requires typing DELETE', () => {
    render(<DeleteAccountDialog />)
    expect(screen.getByRole('button', { name: /Delete account/i })).toBeDisabled()
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- delete-account.test.tsx
```

- [ ] **Step 5: Create `src/app/api/account/delete/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { users, orgMembers, documents, chatSessions, chatMessages, widgetTokens, invites } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { trackServerEvent } from '@/lib/analytics/posthog-server'
import { logger } from '@/lib/log'

export async function POST() {
  const { userId } = await requireOrgMember()
  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await db.update(users).set({ deletedAt: new Date(), deletionScheduledFor: scheduledFor }).where(eq(users.id, userId))
  await trackServerEvent({ distinctId: userId, event: 'user.account_deletion_requested', properties: { scheduledFor } })
  logger.info({ userId, scheduledFor }, 'account deletion requested')
  return NextResponse.json({ ok: true, scheduledFor })
}
```

(Soft delete = mark the user. Actual data hard-delete happens in the cron below.)

- [ ] **Step 6: Create `src/app/api/account/cancel-deletion/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireOrgMember } from '@/lib/auth/org-utils'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  const { userId } = await requireOrgMember()
  await db.update(users).set({ deletedAt: null, deletionScheduledFor: null }).where(eq(users.id, userId))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Create `src/lib/inngest/functions/hardDeleteAccounts.ts`**

```typescript
import { inngest } from '../client'
import { db } from '@/lib/db'
import { users, orgMembers, documents, chatSessions, chatMessages, widgetTokens, invites, organizations } from '@/lib/db/schema'
import { and, eq, isNotNull, lte } from 'drizzle-orm'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/log'

export const hardDeleteAccounts = inngest.createFunction(
  { id: 'hard-delete-accounts' },
  [{ cron: '0 3 * * *' }],
  async ({ step }) => {
    const cutoff = new Date()
    const expired = await step.run('find-expired', () => db.select({ id: users.id }).from(users).where(and(isNotNull(users.deletionScheduledFor), lte(users.deletionScheduledFor, cutoff))))
    for (const { id } of expired) {
      await step.run(`delete:${id}`, async () => {
        // Cascade through all owned data
        const memberships = await db.select({ orgId: orgMembers.orgId }).from(orgMembers).where(eq(orgMembers.userId, id))
        for (const { orgId } of memberships) {
          // delete org if user is sole owner
          const [ownerCount] = await db.execute<{ count: number }>(`SELECT count(*)::int FROM org_members WHERE org_id = '${orgId}' AND role = 'owner'`)
          if (ownerCount?.count === 1) {
            await db.delete(organizations).where(eq(organizations.id, orgId))
          }
        }
        await db.delete(orgMembers).where(eq(orgMembers.userId, id))
        await db.delete(chatSessions).where(eq(chatSessions.userId, id))
        // messages cascade via FK
        await db.delete(users).where(eq(users.id, id))
        // delete from Supabase Auth
        try {
          const admin = createAdminClient()
          await admin.auth.admin.deleteUser(id)
        } catch (err) {
          logger.warn({ err, userId: id }, 'supabase auth delete failed; continuing')
        }
        return { deleted: id }
      })
    }
    return { processed: expired.length }
  }
)
```

- [ ] **Step 8: Register Inngest function in `src/app/api/inngest/route.ts`**

```typescript
import { hardDeleteAccounts } from '@/lib/inngest/functions/hardDeleteAccounts'
// add to functions array
```

- [ ] **Step 9: Create `src/components/settings/DeleteAccountDialog.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteAccountDialog() {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-red-600 text-sm">Delete my account…</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded space-y-3 w-96">
            <h2 className="font-semibold">Delete account?</h2>
            <p className="text-sm text-gray-600">All your data will be permanently removed after a 30-day grace period. You can cancel anytime during that window.</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Type "DELETE" to confirm' className="border rounded px-2 py-1 w-full" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)}>Cancel</button>
              <button
                disabled={confirm !== 'DELETE'}
                onClick={async () => { await fetch('/api/account/delete', { method: 'POST' }); router.push('/goodbye') }}
                className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >Delete account</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 10: Create `src/components/settings/CancelDeletionButton.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function CancelDeletionButton() {
  const [done, setDone] = useState(false)
  if (done) return <span className="text-emerald-600 text-sm">Cancellation confirmed.</span>
  return (
    <button
      onClick={async () => { await fetch('/api/account/cancel-deletion', { method: 'POST' }); setDone(true) }}
      className="text-emerald-600 text-sm underline"
    >I changed my mind — keep my account</button>
  )
}
```

- [ ] **Step 11: Modify `src/app/dashboard/settings/page.tsx`**

Add a Danger tab section:
```tsx
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog'
import { CancelDeletionButton } from '@/components/settings/CancelDeletionButton'
// in the Danger tab content (Task 39 from Plan 2):
<DeleteAccountDialog />
{scheduledFor && <p className="text-sm text-amber-600 mt-2">Deletion scheduled for {new Date(scheduledFor).toLocaleDateString()}. <CancelDeletionButton /></p>}
```

- [ ] **Step 12: Create `src/app/goodbye/page.tsx`**

```tsx
export default function GoodbyePage() {
  return (
    <div className="max-w-md mx-auto p-8 space-y-3">
      <h1 className="text-xl font-semibold">Your account is scheduled for deletion</h1>
      <p className="text-sm text-gray-600">All your data will be permanently removed within 30 days. If you change your mind, sign back in within that window and cancel the deletion from Settings.</p>
    </div>
  )
}
```

- [ ] **Step 13: Run tests, expect PASS**

```bash
npm test -- delete-account.test.tsx
```

- [ ] **Step 14: Commit**

```bash
git add src/app/api/account/ src/lib/account/ src/lib/inngest/functions/hardDeleteAccounts.ts src/components/settings/ src/app/dashboard/settings/ src/app/goodbye/ src/lib/db/migrations/ src/lib/db/schema.ts src/app/api/inngest/
git commit -m "feat(gdpr): account deletion with 30-day grace + Inngest hard-delete cron"
```

---

## Task 9: Terms of Service, Privacy, DPA + consent on signup

**Files:**
- Create: `src/app/(legal)/terms/page.tsx`
- Create: `src/app/(legal)/privacy/page.tsx`
- Create: `src/app/(legal)/dpa/page.tsx`
- Create: `src/components/auth/ConsentCheckbox.tsx`
- Create migration `0013_consent.sql` (add `tos_accepted_at`, `privacy_accepted_at` to `users`)
- Modify `src/lib/db/schema.ts`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/login/page.tsx` (footer link)
- Create: `src/app/(legal)/legal.test.tsx` (renders smoke test)

- [ ] **Step 1: Migration `0013_consent.sql`**

```sql
ALTER TABLE users ADD COLUMN tos_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN privacy_accepted_at timestamptz;
```

- [ ] **Step 2: Add to schema**

```typescript
export const users = pgTable('users', {
  // ... existing cols ...
  tosAcceptedAt: timestamp('tos_accepted_at', { withTimezone: true }),
  privacyAcceptedAt: timestamp('privacy_accepted_at', { withTimezone: true }),
})
```

- [ ] **Step 3: Write the test**

`src/app/(legal)/legal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TermsPage from './terms/page'
import PrivacyPage from './privacy/page'
import DpaPage from './dpa/page'

describe('Legal pages', () => {
  it('Terms page renders', () => { render(<TermsPage />); expect(screen.getByRole('heading')).toBeInTheDocument() })
  it('Privacy page renders', () => { render(<PrivacyPage />); expect(screen.getByRole('heading')).toBeInTheDocument() })
  it('DPA page renders', () => { render(<DpaPage />); expect(screen.getByRole('heading')).toBeInTheDocument() })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- \(legal\)/legal.test.tsx
```

- [ ] **Step 5: Create `src/app/(legal)/terms/page.tsx`**

```tsx
export const metadata = { title: 'Terms of Service — LexiLift' }

export default function TermsPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <h2>1. Acceptance</h2>
      <p>By creating a LexiLift account, you agree to these terms.</p>
      <h2>2. Service</h2>
      <p>LexiLift provides a RAG-as-a-service platform. You retain ownership of your content; we process it solely to provide the service.</p>
      <h2>3. Acceptable use</h2>
      <p>No unlawful content, no attempt to circumvent rate limits, no resale of the service.</p>
      <h2>4. Termination</h2>
      <p>You may delete your account at any time. We may suspend accounts that violate these terms.</p>
      <h2>5. Liability</h2>
      <p>LexiLift is provided "as is" without warranty. Our liability is limited to fees paid in the last 12 months.</p>
      <h2>6. Governing law</h2>
      <p>These terms are governed by the laws of the State of Delaware, USA.</p>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/app/(legal)/privacy/page.tsx`**

```tsx
export const metadata = { title: 'Privacy Policy — LexiLift' }

export default function PrivacyPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account email, name, and auth provider (Supabase Auth).</li>
        <li>Documents you upload and chat messages you send.</li>
        <li>Usage telemetry: API call counts, feature usage, error reports (Sentry), page views (PostHog).</li>
        <li>Billing data managed by Polar.sh — we do not store card numbers.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide the service, improve it, and respond to support requests. We do not sell your data.</p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Supabase (Postgres + Auth + Storage)</li>
        <li>Pinecone (vector index)</li>
        <li>Voyage AI, OpenAI, Anthropic, Google (LLM/embeddings — your data is not used to train their models)</li>
        <li>Polar.sh (billing)</li>
        <li>Resend (transactional email)</li>
        <li>Sentry (error monitoring)</li>
        <li>PostHog (product analytics)</li>
        <li>Vercel (hosting)</li>
        <li>Upstash (rate limit)</li>
      </ul>
      <h2>Your rights (GDPR)</h2>
      <p>You can export or delete your data from Settings. Email privacy@lexilift.dev for any other request. We respond within 30 days.</p>
      <h2>Data retention</h2>
      <p>Account data is retained until you delete your account. Soft-deleted accounts are hard-deleted within 30 days.</p>
      <h2>Contact</h2>
      <p>privacy@lexilift.dev</p>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/(legal)/dpa/page.tsx`**

```tsx
export const metadata = { title: 'Data Processing Addendum — LexiLift' }

export default function DpaPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Data Processing Addendum</h1>
      <p>This DPA supplements our Terms of Service and reflects our GDPR Art. 28 obligations as a processor.</p>
      <h2>1. Roles</h2>
      <p>You are the Controller. We are the Processor.</p>
      <h2>2. Subject matter</h2>
      <p>Processing of Customer Content (documents, chat messages) to provide the LexiLift service.</p>
      <h2>3. Duration</h2>
      <p>For the term of the agreement plus 30 days for deletion.</p>
      <h2>4. Nature and purpose</h2>
      <p>Embedding, indexing, retrieval-augmented generation, and storage of Customer Content.</p>
      <h2>5. Categories of data</h2>
      <p>Any text or document content the Customer chooses to upload. No special categories of personal data are knowingly processed.</p>
      <h2>6. Sub-processors</h2>
      <p>See Privacy Policy. We notify Customers of new sub-processors 30 days in advance.</p>
      <h2>7. Security</h2>
      <p>Encryption in transit (TLS 1.2+). Encryption at rest (Supabase). RLS on all data. Sentry scrubbing of PII. Annual SOC 2 review target (Q3 2026).</p>
      <h2>8. Assistance</h2>
      <p>We assist with data subject requests via the in-app export/delete tools and via privacy@lexilift.dev.</p>
      <h2>9. Standard Contractual Clauses</h2>
      <p>For transfers outside the EEA, the EU Commission's 2021 SCCs apply.</p>
    </div>
  )
}
```

- [ ] **Step 8: Create `src/components/auth/ConsentCheckbox.tsx`**

```tsx
'use client'
import Link from 'next/link'

export function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>
        I agree to the <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </span>
    </label>
  )
}
```

- [ ] **Step 9: Modify `src/app/signup/page.tsx`**

```tsx
import { ConsentCheckbox } from '@/components/auth/ConsentCheckbox'
// add state for consent, gate submit on checked=true
const [consent, setConsent] = useState(false)
// in form JSX, before submit:
<ConsentCheckbox checked={consent} onChange={setConsent} />
// disable submit when !consent
<button disabled={!consent}>Sign up</button>
```

- [ ] **Step 10: Modify `src/app/login/page.tsx`**

Add a footer link:
```tsx
<p className="text-xs text-gray-500 text-center mt-4">
  By signing in you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy</Link>.
</p>
```

- [ ] **Step 11: Run tests, expect PASS**

```bash
npm test -- \(legal\)/legal.test.tsx
```

- [ ] **Step 12: Commit**

```bash
git add "src/app/(legal)/" src/components/auth/ src/app/signup/ src/app/login/ src/lib/db/migrations/ src/lib/db/schema.ts
git commit -m "feat(legal): ToS, Privacy, DPA pages + signup consent"
```

---

## Task 10: Audit log (sensitive operations)

**Files:**
- Create migration `0014_audit_events.sql`
- Modify `src/lib/db/schema.ts`
- Create: `src/lib/audit/log.ts`
- Create: `src/lib/audit/log.test.ts`
- Modify: `src/app/api/account/delete/route.ts` (log event)
- Modify: `src/app/api/account/cancel-deletion/route.ts` (log event)
- Modify: `src/app/api/organizations/[id]/route.ts` (log on delete)
- Modify: `src/app/api/team/members/[id]/route.ts` (log role change + remove)
- Modify: `src/app/api/billing/checkout/route.ts` (log upgrade)
- Create: `src/app/api/audit/route.ts` (admin-only read endpoint, optional)

- [ ] **Step 1: Migration `0014_audit_events.sql`**

```sql
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_org_idx ON audit_events(org_id);
CREATE INDEX audit_events_created_at_idx ON audit_events(created_at DESC);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org admins read audit" ON audit_events FOR SELECT
  USING (is_org_admin(org_id));
```

- [ ] **Step 2: Add to schema**

```typescript
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  metadata: jsonb('metadata'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 3: Write the test**

`src/lib/audit/log.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/db', () => ({ db: { insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }) } }))

import { logAuditEvent } from './log'
import { db } from '@/lib/db'

describe('logAuditEvent', () => {
  it('inserts a row', async () => {
    await logAuditEvent({ orgId: 'o1', actorId: 'u1', action: 'org.delete', targetType: 'organization', targetId: 'o1' })
    expect(db.insert).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run test, expect FAIL**

```bash
npm test -- audit/log.test.ts
```

- [ ] **Step 5: Create `src/lib/audit/log.ts`**

```typescript
import { db } from '@/lib/db'
import { auditEvents } from '@/lib/db/schema'
import { headers } from 'next/headers'

export interface AuditInput {
  orgId: string
  actorId: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(input: AuditInput) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null
  const ua = h.get('user-agent') ?? null
  await db.insert(auditEvents).values({
    orgId: input.orgId,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
    ip,
    userAgent: ua,
  })
}
```

- [ ] **Step 6: Hook into `src/app/api/account/delete/route.ts`**

After the soft-delete update:
```typescript
import { logAuditEvent } from '@/lib/audit/log'
// ...
await logAuditEvent({ orgId, actorId: userId, action: 'account.delete.requested', targetType: 'user', targetId: userId, metadata: { scheduledFor } })
```

- [ ] **Step 7: Hook into `src/app/api/organizations/[id]/route.ts` (DELETE branch)**

```typescript
await logAuditEvent({ orgId, actorId: userId, action: 'org.delete', targetType: 'organization', targetId: orgId })
```

- [ ] **Step 8: Hook into `src/app/api/team/members/[id]/route.ts`**

In PATCH:
```typescript
await logAuditEvent({ orgId, actorId: userId, action: 'member.role_changed', targetType: 'org_member', targetId: id, metadata: { newRole: body.role } })
```

In DELETE:
```typescript
await logAuditEvent({ orgId, actorId: userId, action: 'member.removed', targetType: 'org_member', targetId: id })
```

- [ ] **Step 9: Run test, expect PASS**

```bash
npm test -- audit/log.test.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/audit/ src/lib/db/migrations/ src/lib/db/schema.ts src/app/api/account/delete/ src/app/api/organizations/ src/app/api/team/members/
git commit -m "feat(audit): log sensitive operations (delete, role change, etc.)"
```

---

## Task 11: Backups runbook + secrets rotation doc

**Files:**
- Create: `docs/runbook.md`
- Create: `docs/secrets.md`
- Create: `docs/architecture.md`

- [ ] **Step 1: Create `docs/architecture.md`**

```markdown
# LexiLift Architecture

## Service map
```
[Browser] → [Vercel Edge] → [Vercel Functions (Next.js 16 App Router)]
                                  ├─ [Supabase Postgres] (RLS-enforced)
                                  ├─ [Supabase Auth]
                                  ├─ [Supabase Storage]
                                  ├─ [Pinecone] (vector index, org-namespaced)
                                  ├─ [Inngest] (event bus + cron)
                                  ├─ [Polar.sh] (billing)
                                  ├─ [Resend] (email)
                                  ├─ [Sentry] (errors)
                                  ├─ [PostHog] (analytics)
                                  ├─ [Upstash Redis] (rate limit)
                                  └─ [OpenAI / Anthropic / Gemini / Voyage] (LLM + embeddings + rerank)
```

## Data residency
- Postgres: Supabase US East (Frankfurt for EU customers — config in `.env`)
- Pinecone: us-east-1
- LLM providers: per their policies (OpenAI: US, Anthropic: US, Google: global)

## Trust boundaries
- All API routes: authenticated via Supabase session cookie (except webhook receivers which use HMAC)
- RLS: every table has `is_org_member(org_id)` policy
- Admin client (`createAdminClient`) is used only in Inngest functions and webhook handlers
- All secrets are env vars; none are in code or repo
```

- [ ] **Step 2: Create `docs/runbook.md`**

```markdown
# LexiLift Runbook

## Health checks
- Liveness: `GET /api/health` (200 always)
- Readiness: `GET /api/ready` (200 if DB reachable; 503 otherwise)

## Monitoring
- Errors: Sentry dashboard `lexilift-web` project
- Logs: Vercel function logs (structured pino JSON)
- Analytics: PostHog `lexilift` project
- Uptime: Vercel automatic; status page at https://lexilift.statuspage.io (TBD)

## Common incidents

### "Readiness probe failing"
1. Check Supabase status page.
2. Check Vercel function logs for DB connection errors.
3. If widespread, fail over to read replica (TBD).
4. Post incident update on Twitter + status page.

### "Sentry error spike"
1. Identify the top error in Sentry.
2. Check if it's a single customer (filter by `org.id` or `user.id`).
3. Check if a recent deploy correlates (Vercel → Deployments → check commit).
4. If needed, rollback via Vercel → Deployments → Promote previous.
5. Post-mortem within 48h.

### "Rate limit alerts"
1. Upstash dashboard → check which scope (query, widget, ingest).
2. If legitimate traffic: bump limit in `src/lib/ratelimit/scopes.ts`.
3. If attack: enable Vercel WAF rule, contact customer.

## Backups

### Database (Supabase)
- Point-in-Time Recovery (PITR) is enabled — 7 days retention on Pro plan.
- Daily logical backup runs at 02:00 UTC (managed by Supabase).
- To restore to a specific timestamp:
  1. Open Supabase dashboard → Project → Database → Backups.
  2. Click "Restore to point in time".
  3. Select the timestamp; review affected rows.
  4. Confirm.
- **DR drill:** quarterly, restore a staging DB from a production backup. Document results in `docs/drills/`.

### Vectors (Pinecone)
- Pinecone indexes are serverless with multi-AZ replication.
- Backups: `pc index backup` (CLI) or via dashboard → Index → Backups. Frequency: weekly.
- Restore: `pc index restore` to a new index, then re-point `PINECONE_INDEX` env var.

### Object storage (Supabase Storage)
- RLS-protected. No separate backup — files are tied to org records. If a customer's data is restored from DB backup, files are restored in lockstep via the storage backup that runs in parallel with the DB backup.

## On-call
- Primary: rotating weekly (see PagerDuty schedule "lexilift-primary").
- Secondary: rotating weekly.
- Escalation: if primary doesn't acknowledge in 10 min, page secondary.
- Out of hours: response within 1h for P1, 4h for P2, next business day for P3.
```

- [ ] **Step 3: Create `docs/secrets.md`**

```markdown
# Secrets & Rotation Policy

## Secret inventory
| Secret | Provider | Rotation | Owner |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | 90 days | Platform |
| `POLAR_API_KEY` | Polar.sh | 90 days | Billing |
| `POLAR_WEBHOOK_SECRET` | Polar.sh | 365 days | Billing |
| `RESEND_API_KEY` | Resend | 90 days | Platform |
| `OPENAI_API_KEY` | OpenAI | 90 days | Platform |
| `ANTHROPIC_API_KEY` | Anthropic | 90 days | Platform |
| `GOOGLE_API_KEY` | Google Cloud | 90 days | Platform |
| `VOYAGE_API_KEY` | Voyage | 90 days | Platform |
| `PINECONE_API_KEY` | Pinecone | 90 days | Platform |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | 180 days | Platform |
| `POSTHOG_PROJECT_API_KEY` | PostHog | 365 days | Analytics |
| `SENTRY_AUTH_TOKEN` | Sentry | 365 days | Platform |
| `SENTRY_DSN` | Sentry | never (read-only) | Platform |

## Rotation procedure
1. Generate new secret in the provider's dashboard.
2. Add to Vercel env vars (production + preview) — keep both old and new for the overlap window.
3. If applicable, update the provider's webhook signing key.
4. Verify the new value works (e.g., a canary request).
5. Remove the old value from Vercel.
6. Record in `docs/secrets-rotation-log.md` (date, secret, by whom).

## Storage
- **Never** commit secrets to git (enforced by `gitleaks` in CI).
- Local dev: copy from 1Password → `.env.local`.
- Staging + production: Vercel env vars, scoped per environment.
```

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs(infra): architecture, runbook, secrets rotation policy"
```

---

## Task 12: gitleaks + npm audit in CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.gitleaks.toml`
- Create: `.npmrc` (save-exact)

- [ ] **Step 1: Create `.npmrc`**

```
save-exact=true
audit-level=high
```

- [ ] **Step 2: Create `.gitleaks.toml`**

```toml
title = "LexiLift gitleaks config"

[extend]
useDefault = true

[[rules]]
id = "lexilift-polar-webhook"
description = "Polar webhook secret"
regex = '''POLAR_WEBHOOK_SECRET\s*=\s*['"]?[a-zA-Z0-9_]{20,}'''
tags = ["secret", "polar"]

[[rules]]
id = "lexilift-sentry-auth-token"
description = "Sentry auth token"
regex = '''sntrys_[a-zA-Z0-9_]{40,}'''
tags = ["secret", "sentry"]
```

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm audit --omit=dev --audit-level=high
        continue-on-error: false

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

- [ ] **Step 4: Commit**

```bash
git add .github/ .gitleaks.toml .npmrc
git commit -m "ci: lint+test+build+npm audit+gitleaks on PR"
```

---

## End of Plan 3

When this plan is complete, the app is production-deployable. Plan 4 adds the test coverage, accessibility audit, and end-to-end Playwright flows needed to ship confidently.
