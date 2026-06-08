# LexiLift Architecture

This document is the canonical reference for how LexiLift is built and where the
trust boundaries live. Use it as the first stop when onboarding, planning a
change, or responding to an incident.

## Service map

```
                              ┌──────────────────────────┐
                              │       End users          │
                              │  (browser + widget SDK)  │
                              └────────────┬─────────────┘
                                           │ HTTPS
                                           ▼
                              ┌──────────────────────────┐
                              │   Vercel Edge Network    │
                              │  (TLS, WAF, edge cache)  │
                              └────────────┬─────────────┘
                                           │
                                           ▼
                ┌──────────────────────────────────────────────┐
                │       Vercel Functions (Next.js 16)          │
                │  App Router + Route Handlers + Server Acts   │
                └─┬─────────┬─────────┬─────────┬───────────┬───┘
                  │         │         │         │           │
   ┌──────────────┘         │         │         │           └──────────────┐
   │                        │         │         │                          │
   ▼                        ▼         ▼         ▼                          ▼
┌──────────┐         ┌──────────┐ ┌────────┐ ┌──────────────┐    ┌──────────────────┐
│ Supabase │         │ Pinecone │ │ Inngest│ │   LLM stack  │    │  3rd-party APIs  │
│  ─ Auth  │         │  (vector │ │ (event │ │  OpenAI      │    │  ─ Polar.sh      │
│  ─ DB    │         │   index, │ │  bus + │ │  Anthropic    │    │  ─ Resend        │
│  ─ Store │         │   org-   │ │  cron) │ │  Google (Gem) │    │  ─ Sentry        │
│          │         │  namespc) │ │        │ │  Voyage AI    │    │  ─ PostHog       │
└──────────┘         └──────────┘ └────────┘ │  (embed+rerank)│   │  ─ Upstash Redis │
                                              └──────────────┘    └──────────────────┘
```

### 3rd-party service inventory

| Service       | Purpose                                  | Auth surface                  |
|---------------|------------------------------------------|-------------------------------|
| Supabase      | Postgres + Auth + Object storage        | Anon key (browser) / service role (server) |
| Pinecone      | Vector search (org-namespaced indexes)  | API key (server only)         |
| Voyage AI     | Cross-encoder reranking                  | API key (server only)         |
| OpenAI        | Embeddings (`text-embedding-3-small`) + chat fallback | API key (server only) |
| Anthropic     | Primary chat model (Claude)              | API key (server only)         |
| Google        | Chat model fallback (Gemini)             | API key (server only)         |
| Polar.sh      | Subscription billing + webhook source    | Access token + webhook secret |
| Resend        | Transactional email                      | API key (server only)         |
| Sentry        | Error tracking + session replay          | DSN (read-only ingest) + auth token (CI) |
| PostHog       | Product analytics + feature flags        | Project API key (browser-safe) |
| Upstash Redis | Rate limit counters + ephemeral state    | REST token (server only)      |
| Vercel        | Hosting, edge, cron, build pipeline      | OIDC-linked deploy tokens     |
| Inngest       | Event bus + scheduled jobs               | Event key + signing key       |

## Data residency

| Data class              | Location                                | Notes                                                                |
|-------------------------|-----------------------------------------|----------------------------------------------------------------------|
| Postgres (operational)  | Supabase **US East** by default         | Switch to **Frankfurt (`aws-1-eu-central-1`)** for EU customers via `DATABASE_URL` |
| Object storage          | Same region as the linked Supabase DB   | Buckets are RLS-protected; org-scoped                                |
| Vector embeddings       | Pinecone `us-east-1`                    | Single region; serverless with multi-AZ replication                  |
| LLM prompts/responses   | Per provider policy (OpenAI/Anthropic: US; Google: global) | No customer data is stored by providers under our contracts    |
| Email                   | Resend (US, multi-region transit)       | Transactional only; no marketing list at the moment                   |
| Logs (Vercel)           | Vercel region of the deployment         | 7-day retention on Pro plan                                          |
| Backups (Postgres)      | Same region as primary                  | PITR + daily logical                                                  |

> **EU data residency:** moving a customer to the EU region requires re-uploading
> their documents (vectors are not cross-region). See `docs/runbook.md` →
> "Customer data region migration" for the playbook.

## Trust boundaries

### Request path authentication

All incoming traffic is mediated by `src/proxy.ts` (Next.js 16 `proxy` export,
the middleware equivalent). The following prefixes are **public**:

| Prefix             | Reason                                              |
|--------------------|-----------------------------------------------------|
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth flows            |
| `/verify-email`    | Email verification deep link                        |
| `/api/auth`        | Supabase auth callbacks                             |
| `/widget`, `/api/widget` | Embeddable widget (token-authenticated at the route level) |
| `/api/inngest`     | Inngest event delivery (HMAC-signed)                |
| `/api/cron`        | Vercel cron triggers                                |
| `/api/webhooks`    | Inbound webhooks (HMAC-verified per provider)      |
| `/api/ready`       | Readiness probe (DB ping)                           |
| `/terms`, `/privacy`, `/dpa` | Legal pages                              |
| `/_next`, `/favicon`, `/` | Static assets + landing page                  |
| `/api/health`      | Liveness probe                                      |

Everything else requires a valid Supabase session cookie and a confirmed email
address. Unauthenticated `/api/*` calls receive `401`. Unauthenticated page
requests are redirected to `/login?next=…`.

### Server-side trust tiers

- **User client (`createServerClient`)** — uses the anon key + the user's
  session cookie. Subject to Row-Level Security.
- **Admin client (`createAdminClient`)** — uses the service-role key. **Bypasses
  RLS.** It is used in exactly two places:
  1. Inngest functions (no user session is present in the worker)
  2. Webhook handlers (the caller is the upstream provider, not an end user)
  Both call sites are reviewed in `src/lib/supabase/admin.ts` callers — adding a
  new caller requires justifying why RLS would block the operation.
- **Browser client** — anon key only. RLS is the security boundary.

### Row-Level Security

Every table carrying tenant data has an RLS policy predicated on the SQL helpers
`is_org_member(org_id)` (read) or `is_org_admin(org_id)` (write). The helpers
read `auth.uid()` and the `memberships` table. New tables **must** declare a
policy in the same migration that creates them — see `docs/db/RULES.md`
(planned) or the migration comments.

### Secrets boundary

- All secrets are environment variables. **No secret value is ever committed to
  the repository** (CI runs `gitleaks`).
- The Vercel dashboard is the source of truth for production and preview
  environments. Local development reads from `.env.local`, which is
  `.gitignore`d.
- The detailed inventory, owners, and rotation cadence live in
  [`docs/secrets.md`](secrets.md).

## Application architecture

- **Framework:** Next.js **16.2.6** (custom fork — see `AGENTS.md`). App Router
  with route groups `(auth)`, `(legal)`, and `dashboard`.
- **Runtime:** Vercel Functions (Node.js, not Edge — Postgres driver + Node-only
  deps). Edge is used only for the proxy/auth middleware.
- **Server logic:** Most mutations are server actions colocated with the page
  that triggers them. Cross-cutting endpoints (webhooks, health, Inngest
  receiver, API for the widget) live under `src/app/api/`.
- **Database access:** Drizzle ORM against Supabase Postgres. Migrations live
  in `src/lib/db/migrations/` and run automatically via `predev` and `prebuild`.
- **Schema validation:** Zod at every trust boundary (form input, webhook
  payload, env vars via `src/lib/env.ts`).
- **Auth:** Supabase hosted auth (email + Google OAuth). Email verification is
  required before accessing any non-public route.
- **Logging:** Pino with PII redaction, child loggers tied to a per-request
  `x-request-id`. See `src/lib/log/log.ts`.
- **Error reporting:** Sentry (client + server) with user/org context bridged
  from the session.
- **Analytics:** PostHog (browser + server). Server events are sent from
  Inngest functions and from server actions.

## RAG pipeline

```
                        ┌────────────────────────────┐
   user question ───►   │  OpenAI text-embedding-3   │   1536-dim vector
                        │  -small                    │ ────────────────►
                        └────────────────────────────┘
                                                          │
                                                          ▼
                        ┌────────────────────────────┐
                        │  Pinecone similarity       │   top-20 by
                        │  search (org-namespaced)   │ ◄─ cosine
                        └────────────────────────────┘
                                                          │
                                                          ▼
                        ┌────────────────────────────┐
                        │  Voyage AI rerank-2        │   top-5 reranked
                        │  (cross-encoder)           │ ◄─ by relevance
                        └────────────────────────────┘
                                                          │
                                                          ▼
                        ┌────────────────────────────┐
                        │  Context-augmented LLM     │   primary: Claude
                        │  call (system + chunks +   │   fallbacks: GPT-4o,
                        │  conversation history)     │            Gemini
                        └────────────────────────────┘
```

- **Embedding dimension** is `EMBEDDING_DIMENSION=1536` (configurable). The
  Pinecone index is created with the matching dimension by
  `scripts/recreate-pinecone-index.mjs`. A mismatch is a known failure mode
  — see [`runbook.md`](runbook.md) → "Pinecone dim mismatch".
- **Org namespace** is enforced via Pinecone metadata filter `org_id = …` on
  every query, mirroring the RLS boundary in Postgres.
- **Streaming:** tokens are streamed from the LLM to the browser via the Vercel
  AI SDK (`@ai-sdk/react`).

## Background jobs (Inngest)

| Function             | Trigger                                 | Purpose                                                       |
|----------------------|-----------------------------------------|---------------------------------------------------------------|
| `processDocument`    | event `document/uploaded` / `document/url.submitted` | Parse, chunk, embed, upsert into Pinecone (3 retries) |
| `resetQueryCounts`   | cron `0 0 1 * *` (1st of month, 00:00 UTC) | Zero out monthly query counts on `organizations`        |
| `checkUsageAlerts`   | cron `0 9 * * *` (daily 09:00 UTC)      | Email org owners whose usage is ≥ 80% of their plan limit     |
| `syncSubscriptions`  | cron `0 6 * * *` (daily 06:00 UTC)      | Reconcile `organizations.plan` against Polar.sh state         |
| `purgeSoftDeleted`   | cron `0 3 * * *` (daily 03:00 UTC)      | Purge documents past their soft-delete TTL (stub today)        |
| `hardDeleteAccounts` | cron `0 3 * * *` (daily 03:00 UTC)      | Permanently delete profiles/orgs whose 30-day grace expired   |

The Inngest dev UI is at `http://localhost:3000/api/inngest` when running
`npm run dev:inngest`. Production runs are visible in the Inngest cloud
dashboard under the `lexilift` app.

## Auth flow

```
        ┌──────────────┐     ┌─────────────────────┐     ┌────────────────┐
signup ►│ /signup form │ ──► │ Supabase Auth       │ ──► │ sends verify   │
        │  email+pw or │     │ (email | Google)    │     │ email via      │
        │  Google      │     │                     │     │ Resend         │
        └──────────────┘     └─────────────────────┘     └───────┬────────┘
                                                                │
                                                                ▼
                                                ┌───────────────────────────┐
                                                │ /verify-email deep link   │
                                                │ (Supabase callback)       │
                                                └─────────────┬─────────────┘
                                                              │
                                                              ▼
                                                ┌───────────────────────────┐
                                                │ Session cookie set,       │
                                                │ proxy allows access       │
                                                └───────────────────────────┘
```

- **Rate limits** (Upstash): `signin` and `forgot-password` are throttled per
  email + per IP to deter credential stuffing. See `src/lib/ratelimit/scopes.ts`.
- **Session refresh** is handled by `@supabase/ssr` inside
  `src/lib/auth/supabase/middleware.ts`, called from the proxy on every request.
- **Org membership:** first user becomes owner of a new personal org. Team
  invites flow through `/api/invites` (HMAC-signed invite token).

## Billing

- **Provider:** Polar.sh. The org/product mapping lives in env:
  `POLAR_ORG_ID`, `POLAR_PRO_PRODUCT_ID`, `POLAR_TEAM_PRODUCT_ID`.
- **Checkout:** the client redirects to a Polar-hosted checkout; Polar sends
  the user back to `APP_URL/billing/return`.
- **State sync:** every state change emits a webhook to `/api/webhooks/polar`
  (HMAC-verified with `POLAR_WEBHOOK_SECRET`). The handler upserts the
  subscription into `organizations`.
- **Reconciliation:** `syncSubscriptions` (cron) catches anything the webhook
  missed (network blip, replay, etc.).
- **Plan limits:** `queryLimit` is read from the org row by the rate limit
  middleware. Free plans are capped at 100 queries/month.

## Future work

- Status page at `https://lexilift.statuspage.io` (TBD).
- SOC 2 Type II — target Q3 2026.
- Multi-region read replicas for Postgres.
- EU-only data residency as a customer-selectable option.
