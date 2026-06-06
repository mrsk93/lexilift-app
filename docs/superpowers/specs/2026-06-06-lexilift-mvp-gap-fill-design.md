# LexiLift MVP Gap-Fill — Design Doc

**Date:** 2026-06-06
**Status:** Draft for review
**Supersedes:** Nothing — adds to `docs/plans/implementation_plan.md` (v3.1)
**Scope:** §2 bugs + §3 RLS + §4 features + §5 infra + §6 compliance + §7 tests

---

## 0. Executive Summary

The repo is **mid-build**: every file mentioned in the plan exists, but most are scaffolds with `// mock` comments, hard-coded `mock-org-id`, and missing wiring. To call this an MVP, we need to:

1. Fix 13 active bugs that would fail on first real run.
2. Complete RLS policies + add `is_org_*` SQL helpers.
3. Make the ingestion pipeline actually durable (Inngest functions with `step.run()`, real Storage download, real `inngest.send()` trigger).
4. Kill every `mock-org-id` / `mockOrgs` and wire pages to the real profile's `currentOrgId`.
5. Build the four user-facing surfaces the plan promises but the UI is missing (citations, feedback, widget, analytics).
6. Build usage tracking + plan enforcement + monthly reset.
7. Add `next.config.ts` security headers, error/loading/not-found, CI, and unit/E2E tests.
8. Add GDPR plumbing (consent, export, delete) so enterprise deals are not blocked.

Estimated effort: **~52–65 sessions** (≈ 13–16 calendar weeks at 4–5 sessions/week), on top of the v3.1 plan's existing ~85 sessions.

---

## 1. Goals & Non-Goals

### Goals
- Every page in the plan renders with real data.
- Real RLS enforced at the database level (defence in depth).
- End-to-end flow works in production: signup → org auto-create → upload → ingest → query → embed widget → get billed.
- Tests run in CI and block merges.
- No `// mock`, no `mock-org-id`, no commented-out `fetch` triggers in the shipped code.

### Non-Goals (explicitly deferred to post-MVP)
- Deep Search / Agentic RAG
- White-label custom domains
- Notion / Google Docs / YouTube / CSV ingest
- Multi-language detection
- Human handoff / email escalation
- Public REST API
- SOC 2 / ISO 27001 certification (the hooks are in; the audit is later)

---

## 2. Architecture Decisions

### AD-1. Background jobs → Inngest
- Add `inngest` to `package.json` (no `vercel-workflow`).
- New `src/lib/inngest/client.ts` exports a singleton `inngest` client.
- New `src/lib/inngest/functions/processDocument.ts` defines the document ingestion function with `step.run()` for each phase (download, parse, chunk, embed, upsert, notify). Each step is auto-retried and replay-safe.
- Trigger from `src/app/api/ingest/route.ts` via `inngest.send({ name: 'document/uploaded', data: { docId } })`.
- The `process` route sends the same event for re-processing.
- New `src/lib/inngest/functions/resetQueryCounts.ts` (`0 0 1 * *`), `checkUsageAlerts.ts` (`0 9 * * *`), `syncSubscriptions.ts` (`0 6 * * *`), `purgeSoftDeleted.ts` (`0 3 * * *`) — all using Inngest's `cron` trigger.
- New `src/app/api/inngest/route.ts` exports `serve()` from `inngest/next` so Inngest Cloud can discover and invoke the functions.
- Local dev: `npx inngest-cli@latest dev` (run concurrently with `next dev`); the dev server auto-discovers functions via the `/api/inngest` route and lets you replay individual events.
- Production: Inngest Cloud auto-discovers on first deploy to Vercel.
- All ingestion functions removed from `src/workflows/`; that directory is repurposed for non-Inngest step pipelines (none for MVP).

Rationale: mature platform (5+ years), best-in-class local dev with per-event replay, observability dashboard with per-step status, 1M step functions/mo free tier (~20K doc ingests at 50 steps each — comfortable for MVP). Code-first TypeScript API. Portable: if we outgrow Inngest, we can swap to BullMQ + Redis without rewriting business logic, just the trigger.

### AD-2. Service-role client helper
- New file `src/lib/supabase/admin.ts` exports a single `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`. The storage adapter calls it; nothing else in app code ever touches the service role.
- All RLS-aware code paths continue to use the per-request `createServerClient()` (anon + cookies).

### AD-3. Real organisation resolution
- New file `src/lib/auth/current-org.ts` exports `getCurrentOrgId(): Promise<string | null>`.
  - Reads `profiles.current_org_id` for the current user.
  - If null and user has any membership, picks the oldest membership's `org_id` and patches the profile.
  - If user has zero memberships (shouldn't happen post-callback), throws.
- All server pages and API routes call `getCurrentOrgId()` instead of `mock-org-id`.
- Client components receive `orgId` as a prop from a server parent that already resolved it.

### AD-4. LLM adapter rewrite
- Delete the unused `src/lib/adapters/llm/interface.ts` (it defined `chat(messages, options) → Promise<any>` which doesn't fit streaming).
- Replace with `StreamingLLMAdapter` returning `AsyncIterable<string>` (or compatible with Vercel AI SDK `streamText`).
- Each concrete adapter (`openai.ts`, `anthropic.ts`, `gemini.ts`) wraps the Vercel AI SDK provider and exposes a `stream()` method.
- The factory `getLLM()` returns the adapter; `streamText()` is called inside the adapter, not in the API route.

Rationale: lets us test adapters in isolation, removes the leaky abstraction.

### AD-5. Citation & feedback
- Citations are a first-class JSON shape: `{ index, docId, docName, pageNum?, excerpt, startOffset, endOffset }`.
- The RAG chain returns a `RetrievalResult { context: CitationItem[]; rawMatches: Match[] }`. The prompt instructs the LLM to emit `[n]` markers; a post-processor replaces them with the structured citation client-side.
- `chat_messages.citations` column stays; we also write `chat_messages.latency_ms` and `tokens_used` (already in schema).
- `chat_messages.feedback` is set via a new endpoint `POST /api/chat/[id]/feedback`.

### AD-6. Widget delivery
- Loader script lives at `public/widget.js` (not bundled by Next, served as a static asset with `Cache-Control: public, max-age=300`).
- The script reads `data-token`, `data-color`, `data-position` from the `<script>` tag.
- It creates a sandboxed `<iframe>` to `/widget/[token]?color=…&position=…`.
- `app/widget/[token]/page.tsx` reads the token, fetches `widget_tokens` via service role, applies the config, and renders the chat UI inline (no nested iframe).
- The widget UI is a shared `components/widget/WidgetChat.tsx` consumed by both `/widget/[token]` and a future preview iframe.

### AD-7. Rate limiting
- New `src/lib/rate-limit/upstash.ts` exports `checkRateLimit(key, limit, window)` using `@upstash/ratelimit` (package added).
- Used at: `/api/widget/chat` (per token + per IP), `/api/query` (per user), `/api/ingest` (per org), `/api/auth/*` (per IP for brute-force).

### AD-8. Observability
- `pino` for structured logs (single shared instance in `src/lib/log.ts`).
- **`@sentry/nextjs`** for error reporting; capture server + client + edge.
- **PostHog** for product analytics; key events enumerated in §5.7.

### AD-9. Theming per DESIGN.md
- DESIGN.md says "**Primary emerald green**", "**monochromatic grayscale foundation**", "**off-white paper background**", "**1px borders, no shadows**" — i.e. light by default.
- Current `globals.css` ships with both `:root` (light) and `.dark` (dark) but the layout does not set `className="dark"`. Keep that — the default is light, dark is opt-in via `next-themes` toggle in user menu.
- Add `next-themes` provider in `app/layout.tsx`; toggle in sidebar user menu.

### AD-10. Data residency
- Default: US (Supabase + Pinecone US region).
- Document but defer: EU pinning via region flag on `organizations` (schema migration deferred to v1.1).

### AD-11. Auth providers (resolved)
- **Google only** for OAuth in the MVP (covers ~90% of B2B SaaS).
- Email/password remains the default path.
- Brute-force protection via `@upstash/ratelimit` on `/api/auth/*`.

### AD-12. Charts in analytics (resolved)
- **`recharts`** (~95 KB gz, React-native, easy to theme with Tailwind tokens).

### AD-13. Enterprise DPA (resolved)
- **Static "Contact us for DPA"** page at `/legal/dpa` with a `mailto:` CTA.
- Self-serve click-through DPA is a v1.1 thing.

---

## 3. Bug Fixes (Section §2 of the gap analysis)

Each bug gets a TDD ticket: failing test → fix → green.

| # | File | Bug | Fix |
|---|---|---|---|
| B1 | `src/app/api/query/route.ts:53` | `metadata: { citations: ... }` writes to a column that doesn't exist | Move `citations` to top-level insert; also write `tokens_used` and `latency_ms` |
| B2 | `src/workflows/ingestion.ts:23` | `Buffer.from('Simulated content')` placeholder | Real `fetch(doc.fileUrl)` then `arrayBuffer()`; download from Supabase Storage via service role |
| B3 | `src/app/api/ingest/route.ts:46`, `process/route.ts:30` | Trigger commented out | Call `inngest.send({ name: 'document/uploaded', data: { docId } })` |
| B4 | `src/app/widget/page.tsx` + missing `/widget/[token]/page.tsx` | Widget is a single token-less page | Build per-token route; embed snippet uses `/widget/[token]` |
| B5 | `src/app/dashboard/layout.tsx:38` | `mockOrgs` hard-coded | Resolve real orgs from `memberships` table; remove the literal array |
| B6 | `src/app/api/webhooks/polar/route.ts:20` | Raw HMAC, not Standard Webhooks | Replace with `@polar-sh/sdk`'s `validateWebhook` (already a dep) or use `standardwebhooks` package |
| B7 | `src/app/api/widget/chat/route.ts:13` | `OPTIONS` returns `*`, POST echoes origin | OPTIONS echoes the validated origin only; if `*` is in `allowedOrigins`, OPTIONS responds `*`, otherwise echo origin |
| B8 | `src/lib/adapters/llm/interface.ts` vs `index.ts` | Interface never implemented | See AD-4 — replace with `StreamingLLMAdapter` |
| B9 | `src/components/layout/OrgSwitcher.tsx:89` | "Create Workspace" no-op | Wire to `/api/organizations` POST + dialog |
| B10 | `src/app/dashboard/settings/page.tsx:14` | `handleSave` does nothing | Add `organizations.llmModel` column, add `PUT /api/organizations/settings` route, wire save |
| B11 | `src/app/dashboard/billing/BillingClient.tsx:22`, `src/components/layout/Sidebar.tsx:63` | Hard-coded `342` / `450` | Read real `organizations.query_count` |
| B12 | `src/workflows/ingestion.ts` | Plain function with no durable-job runtime | Replace with Inngest function: `inngest.createFunction({ id, trigger: { event: 'document/uploaded' } }, async ({ event, step }) => { ... })` |
| B13 | `src/middleware.ts` | No real protection — only refreshes token | Add user check: if no user and not on a public path, redirect to `/login` |

---

## 4. RLS Completion

### 4.1. Helper SQL functions

```sql
-- Migration: 0001_rls_helpers.sql
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

### 4.2. Per-table policies (full set)

Replaces the partial file `src/lib/db/rls.sql` and adds:

- `organizations`: SELECT (member), INSERT (auth.uid = created_by), UPDATE (admin), DELETE (owner)
- `memberships`: SELECT (member of same org), INSERT (admin OR self-accepting an invite), UPDATE (admin), DELETE (admin, not self if owner)
- `invites`: SELECT (admin), INSERT (admin), UPDATE (admin OR self-accepting), DELETE (admin)
- `profiles`: SELECT (self), UPDATE (self), INSERT (self on signup via trigger)
- `documents`: SELECT (member), INSERT (admin), UPDATE (admin), DELETE (admin)
- `document_chunks`: SELECT (member via doc.org_id), INSERT/UPDATE/DELETE blocked for `authenticated` role (service role only)
- `chat_sessions`: SELECT (member), INSERT (member), UPDATE (owner of session OR admin), DELETE (owner of session OR admin)
- `chat_messages`: SELECT (member via session), INSERT (member), UPDATE (owner of message), DELETE (admin)
- `widget_tokens`: SELECT (admin), INSERT (admin), UPDATE (admin), DELETE (admin)

### 4.3. Migration tooling
- Add a Drizzle migration generator config: `npx drizzle-kit generate` produces `0001_*.sql` files committed alongside schema changes.
- Update `src/lib/db/migrate.ts` to read all `migrations/*.sql` in order, not the hard-coded `0000_amazing_triton.sql`.
- Document in README: `npm run db:push` for dev, `npm run db:migrate` for prod.

### 4.4. Tests
- Vitest + Supabase local: connect as anon, attempt cross-tenant reads/inserts, assert 0 rows / RLS error.

---

## 5. Functional Features (Section §4 of gap analysis)

### 5.1. Multi-tenant
- **Create Workspace modal** in `OrgSwitcher` — `components/layout/CreateOrgDialog.tsx`, calls `POST /api/organizations`.
- **Org delete** — `DELETE /api/organizations/[id]` (owner only) cascades Storage, Pinecone, chat messages, sessions. Confirmation modal requires typing org name.
- **Owner transfer** — `POST /api/organizations/[id]/transfer` (owner only), new owner must already be a member.
- **Member remove** — `DELETE /api/organizations/[id]/members/[userId]` (admin only). Cannot remove the last owner.
- **Role change** — `PATCH /api/organizations/[id]/members/[userId]` (admin only).
- **Invite accept page** at `app/(auth)/invites/[token]/page.tsx` — server-side, calls `POST /api/invites/accept` (route already exists, needs UI).
- **Invite email** — Resend template `templates/invite.tsx` (React Email), sent from `POST /api/invites`.

### 5.2. Documents
- **URL ingest UI** — new tab in `UploadDropzone` "Add a URL", posts to `POST /api/ingest/url` which downloads via `parseUrl()`, persists a `documents` row, then sends the Inngest `document/uploaded` event.
- **Status polling** — `useEffect` in `DocumentsPage` polls `GET /api/documents?orgId=…` every 2s until all docs are `ready` or `failed`, then stops.
- **Re-process button** — appears in `DocumentDetailPage` header when `status === 'failed'`; calls `POST /api/documents/[id]/process`.
- **Document count column** — add `documents_count` to `organizations` schema; `INSERT` trigger increments, `DELETE` trigger decrements.
- **File-size cap** — `UploadDropzone` rejects > 25 MB client-side; API also enforces.
- **Duplicate detection** — hash file with Web Crypto SHA-256, check for existing `documents.sha256` (new column). Reject or show "Already uploaded" toast.
- **Bulk delete** — checkbox column in `DocumentList`, "Delete selected" button, single `DELETE /api/documents?ids=…` route.
- **Soft delete** — add `deleted_at` timestamp; `documents` queries filter `deleted_at is null`; admin "Trash" view; restore within 30 days; cron purges.
- **Real data** — replace `mock-org-id` and the hard-coded `documents` array in `DocumentsPage` with a server-side fetch.

### 5.3. Chat (dashboard)
- **Session list sidebar** — `components/chat/SessionList.tsx`, server-rendered list of `chat_sessions` for current org, newest first. "New chat" button creates a session via `POST /api/chat` then `router.push`.
- **Auto-title** — on first user message, `POST /api/chat/[id]/title` is called with the first 60 chars; LLM-generated title is preferred (`gpt-4o-mini` + "summarise this in ≤6 words").
- **Model selector** — reads `organizations.llmModel` (new column), updates via `PUT /api/organizations/settings`. Renders in `ChatWindow` header.
- **Token/latency display** — read from the persisted `chat_messages` row, render below the message bubble in JetBrains Mono.
- **Stop button** — `useChat` exposes `stop()`; renders next to send while `isLoading`.
- **Regenerate** — re-submits the last user message with `regenerate=true` flag, server deletes the last assistant message and re-streams.
- **Edit-and-resend** — inline edit pencil; on save, `PATCH /api/chat/[id]/messages/[msgId]` truncates subsequent messages and re-submits.

### 5.4. Citations & feedback
- **`CitationCard.tsx`** — chip with `[1]`, `docName`, `pageNum?`; click opens the source.
- **`SourceHighlight.tsx`** — slide-out panel (DESIGN.md calls for "Source Panel: slide-out with backdrop blur") showing the original document text scrolled to the highlighted passage; for MVP, render a fixed-position Sheet with the chunk text (file viewer can be v1.1).
- **Clickable `[n]` markers** — custom remark plugin parses `\[(\d+)\]` and replaces with `<CitationLink index={n} onClick={openSource(n)} />`.
- **`FeedbackButtons.tsx`** — thumbs up/down in JetBrains Mono per assistant message; optimistic UI, `POST /api/chat/[id]/feedback`.
- **Server-side citation parsing** — `lib/citations/parse.ts` extracts `[n]` from the streamed text, merges with the retrieval result, writes them to the saved `chat_messages.citations` column.

### 5.5. Widget
- **`/widget/[token]/page.tsx`** — server-rendered, reads `widget_tokens` (service role), passes config as props to `WidgetChat`.
- **`public/widget.js`** — vanilla JS, ≤ 8 KB, creates the iframe with sandbox attrs, listens for `message` events from the iframe for resizing, exposes `LexiLift.open()` / `LexiLift.close()`.
- **Widget token CRUD** — `app/dashboard/widget/page.tsx` becomes a real page:
  - List tokens (`GET /api/widget/tokens`)
  - Create (`POST /api/widget/tokens`)
  - Revoke (`PATCH /api/widget/tokens/[id]` sets `is_active = false`)
  - Update branding (`PATCH /api/widget/tokens/[id]/branding`)
- **Widget preview** — real `WidgetChat` rendered in an iframe within the dashboard, listening to the form fields.
- **Branding applied** — `WidgetChat` reads `primaryColor`, `welcomeMessage`, `logoUrl` from the token config; not hard-coded.
- **"Powered by LexiLift"** — footer on widget for `plan === 'starter'`; configurable off for `pro`+; absent for `enterprise` (white-label future).

### 5.6. Billing
- **Team & Enterprise plan cards** — add to `BillingClient`. Team = $79/mo, 50K queries, custom branding. Enterprise = "Contact us" modal.
- **Query-count increment** — `lib/billing/usage.ts` exports `incrementQueryCount(orgId)`; called from `/api/query` and `/api/widget/chat` in the `onFinish` hook.
- **Plan-limit middleware** — `lib/billing/guard.ts` exports `enforceQueryLimit(orgId)`; throws `PlanLimitError` (mapped to HTTP 402 with upgrade URL).
- **Monthly reset** — `src/lib/inngest/functions/resetQueryCounts.ts` (Inngest cron `0 0 1 * *`), zero-out `query_count` for all orgs, set `query_reset_at = now() + interval '1 month'`.
- **Overage handling** — `BillingClient` shows red banner when `query_count / query_limit > 1.0`; "Upgrade" CTA deep-links to `/dashboard/billing`.
- **Subscription status states** — `lib/billing/polar.ts` maps `subscription.active|active_past_due|trialing|canceled|past_due|unpaid` to org states. Webhook handler dispatches to `lib/billing/sync.ts`.
- **Failed-payment / dunning** — when `subscription.past_due` arrives, downgrade to starter, queue dunning email via Resend.
- **Usage alert emails** — `src/lib/inngest/functions/checkUsageAlerts.ts` (cron `0 9 * * *`); sends email when `query_count / query_limit > 0.8`.
- **Polar customer portal** — `BillingClient` "Manage subscription" button → `POST /api/billing/portal` → Polar customer portal URL.
- **Invoice history** — `GET /api/billing/invoices` returns last 12 months of invoices from Polar SDK.

### 5.7. Analytics
- **`src/app/dashboard/analytics/page.tsx`** — server component, three cards: top questions, no-context queries, feedback breakdown.
- **Charts** — use **`recharts`**, light themed per DESIGN.md.
- **PostHog init** — `src/lib/analytics/posthog.ts` server helper, `src/components/PostHogProvider.tsx` client provider in layout.
- **Key events** — `signup_completed`, `org_created`, `workspace_switched`, `document_uploaded`, `document_ready`, `document_failed`, `query_made`, `widget_message`, `feedback_given`, `upgrade_clicked`, `plan_upgraded`, `plan_downgraded`. Each event has `orgId` and `plan` properties.

### 5.8. Onboarding / UX
- **First-run flow** — new `app/dashboard/onboarding/page.tsx` rendered when `documents_count === 0 && chat_sessions_count === 0`; three steps: 1) confirm org name, 2) upload first doc, 3) try a sample query.
- **Empty states** — every dashboard page gets an `EmptyState.tsx` with icon + headline + CTA.
- **Loading skeletons** — `app/dashboard/loading.tsx` + per-route `loading.tsx`.
- **Error boundaries** — `app/dashboard/error.tsx` + per-route `error.tsx`, both with retry + Sentry capture.
- **Toasts** — `components/ui/toast.tsx` re-exports `sonner`'s `toast`; used on upload success, query limit hit, plan upgrade, etc.
- **Theme toggle** — `components/layout/ThemeToggle.tsx` in user menu, persists to `localStorage` via `next-themes`.

### 5.9. Auth
- **Password reset** — `app/(auth)/forgot-password/page.tsx` + `app/(auth)/reset-password/page.tsx`; calls Supabase `resetPasswordForEmail` and `updateUser`.
- **Email verification gate** — middleware blocks unverified users from `/dashboard/*` except `/dashboard/account/verify`.
- **OAuth (Google only)** — Supabase dashboard config + "Continue with Google" button in `login/signup` pages.
- **Brute-force protection** — `@upstash/ratelimit` on `/api/auth/*` (5 req / 5 min / IP).
- **Session expiry** — Supabase JWT default 1h, refresh token 30d. Document in user menu.

---

## 6. Infrastructure (Section §5)

### 6.1. `vercel.json`
```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
    ]},
    { "source": "/widget/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "ALLOWALL" }
    ]}
  ]
}
```
No `crons` block — Inngest owns all scheduling. CSP set in `next.config.ts` (Vercel headers don't support per-route CSP cleanly).

### 6.2. `next.config.ts` additions
- CSP with nonce for inline scripts
- HSTS (`max-age=63072000; includeSubDomains; preload`)
- `images.remotePatterns` for Supabase Storage URLs
- `experimental.serverActions.bodySizeLimit: '25mb'`

### 6.3. CI (`.github/workflows/ci.yml`)
- Jobs: `lint` (ESLint), `typecheck` (tsc --noEmit), `test` (Vitest + coverage), `build` (next build), `e2e` (Playwright, only on `main`).
- Triggers: PR, push to `main`.
- Required secrets: `DATABASE_URL`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, `VOYAGE_API_KEY`, `POLAR_ACCESS_TOKEN`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Status checks required for merge.

### 6.4. Other
- `inngest` + `@upstash/ratelimit` + **`recharts`** + **`@sentry/nextjs`** + `pino` + `standardwebhooks` + `archiver` added to `package.json`.
- `lib/env.ts` switched to zod validation (`@t3-oss/env-nextjs` or hand-rolled) — fail fast on missing required vars at boot.
- `lib/supabase/admin.ts` centralises the service-role client.
- `lib/validate.ts` exports `zodParse(schema, request)` helper for every API route.
- `/api/health` returns 200 with version, env, db ping, pinecone ping, redis ping.
- CI secret scanning via `gitleaks`.

### 6.5. Local dev
- `npm run dev:db` → starts Supabase local stack (`supabase start`).
- `npm run dev:inngest` → starts Inngest dev server (`npx inngest-cli@latest dev`); auto-discovers functions via `/api/inngest`.
- `npm run dev:all` → `concurrently` runs `dev:db`, `dev:inngest`, and `next dev`.
- `npm run seed` → `scripts/seed.ts` creates: 1 starter org, 1 pro org, 5 sample docs, 3 sample chat sessions, 2 widget tokens.

---

## 7. Compliance & Legal (Section §6)

### 7.1. Cookie consent
- `components/CookieConsent.tsx` — banner shown if no `lexilift_consent` cookie. Categories: essential (always on), analytics (PostHog), marketing (none in MVP).
- Gated by `usePostHog().opt_in_capturing()` on the client.

### 7.2. Privacy & ToS
- `app/privacy/page.tsx`, `app/terms/page.tsx` — static MDX pages, linked from landing footer.
- Sub-processor list on `/legal/sub-processors`: Vercel, Supabase, Pinecone, OpenAI, Anthropic, Google, Voyage AI, Polar.sh, Resend, PostHog, Upstash.

### 7.3. GDPR plumbing
- `GET /api/account/export` — streams a zip of all the user's data (profile, orgs, docs metadata, chat history, feedback) via `archiver`.
- `DELETE /api/account` — soft-deletes the user, anonymises content, cancels Polar subscription, drops Pinecone vectors, purges PostHog. 30-day hard-delete cron.
- Confirmation modal requires password re-entry.

### 7.4. DPA / enterprise hooks
- **`/legal/dpa` is a static "Contact us for DPA" page with a `mailto:` CTA.** Self-serve click-through DPA is a v1.1 item.
- `organizations` table gets `data_region` enum column (default `us`); future use.

---

## 8. Testing (Section §7)

### 8.1. Unit (Vitest)
- `src/lib/parsers/__tests__/pdf.test.ts` — golden file, asserts text + page boundaries
- `src/lib/parsers/__tests__/docx.test.ts`
- `src/lib/parsers/__tests__/url.test.ts` — uses `nock` for fetch mock, asserts script/style stripping
- `src/lib/parsers/__tests__/text.test.ts`
- `src/lib/langchain/__tests__/chunking.test.ts` — asserts 1000±10% token chunks, 200 overlap
- `src/lib/langchain/__tests__/rag-chain.test.ts` — mocked Pinecone + Voyage + LLM
- `src/lib/adapters/__tests__/vector-store.test.ts` — round-trip upsert/query/delete
- `src/lib/adapters/__tests__/billing.test.ts` — checkout URL generation, webhook signature validation
- `src/lib/auth/__tests__/org-utils.test.ts`
- `src/lib/billing/__tests__/usage.test.ts` — increment, reset, limit check
- `src/lib/citations/__tests__/parse.test.ts` — `[1]`, `[2]`, `[10]` edge cases

### 8.2. Integration (Vitest + Supabase local)
- `src/app/api/__tests__/auth.test.ts` — signup, callback, logout
- `src/app/api/__tests__/invites.test.ts` — create, accept, expire
- `src/app/api/__tests__/documents.test.ts` — upload, list, delete cascade
- `src/app/api/__tests__/query.test.ts` — auth, plan limit, streaming
- `src/app/api/__tests__/widget.test.ts` — CORS, rate limit, token
- `src/app/api/__tests__/webhooks.test.ts` — Polar signature, payload handling
- `src/lib/db/__tests__/rls.test.ts` — cross-tenant isolation

### 8.3. E2E (Playwright)
- `e2e/signup-to-first-query.spec.ts` — full happy path
- `e2e/widget-embed.spec.ts` — embed iframe, send message, get response with citations
- `e2e/billing-upgrade.spec.ts` — mock checkout, assert plan flipped
- `e2e/team-invite.spec.ts` — invite, accept in second browser context
- `e2e/gdpr-export.spec.ts` — request export, assert zip contents

### 8.4. Property/fuzz
- `fast-check` for citation parser (random LLM outputs, must not throw)

### 8.5. Quality gates
- `vitest --coverage` threshold: 80% statements on `lib/`, 60% on `app/api/`, 30% on components
- Playwright must pass on `main` before deploy

---

## 9. Migration / Rollout

### 9.1. Data migrations
1. **Add `sha256` column** to `documents` (nullable initially, backfill via one-off script, then `NOT NULL`).
2. **Add `documents_count` to `organizations`** (default 0, recompute via `SELECT count(*) FROM documents GROUP BY org_id`).
3. **Add `llmModel` to `organizations`** (default `'gpt-4o'`).
4. **Add `deleted_at` to `documents`** (nullable).
5. **Add `data_region` to `organizations`** (default `'us'`).
6. **Create `widget_token_requests` audit log table** (token_id, ip, ts, allowed).

### 9.2. Cutover
- Drizzle migrations applied automatically on Vercel deploy (build step runs `drizzle-kit push` for non-prod, manual `migrate` for prod).
- Feature flags via PostHog: `widget_v2_loader`, `citations_v2`, `feedback_buttons_v1` — gradual rollout.

### 9.3. Rollback
- All migrations are additive and reversible except RLS — RLS rollout uses shadow-mode for 24h (mirror reads through admin client, log mismatches), then enable.

---

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Polar webhook signature change | Pin SDK version, add contract test |
| R2 | Inngest step cold start latency on first upload of the day | Keep ingest small (≤ 25 MB), Inngest keeps warm pools for paying tier; the free tier is fine for MVP volume |
| R3 | RLS perf regression on chat_messages | Index `(session_id, created_at)`, add `is_org_member` partial index |
| R4 | Citation parsing breaks with multilingual responses | Whitelist `[1-99]` regex; fallback to "untagged citations" |
| R5 | Supabase service role leak | Lint rule: no `SUPABASE_SERVICE_ROLE_KEY` import outside `lib/supabase/admin.ts` |
| R6 | Tests flake on streaming | Use `waitFor` with generous timeout, snapshot first 200 tokens |
| R7 | GDPR export hits Polar rate limits | Pre-fetch in background, email link when ready |
| R8 | Embed widget XSS via widget name | `DOMPurify` on all rendered names; CSP `frame-ancestors` from server side |
| R9 | Soft-delete cron deletes active docs due to clock skew | 30-day buffer, manual override endpoint |
| R10 | Inngest vendor lock-in / free-tier limits | All triggers funnel through `inngest.send()`; business logic is plain async functions — swapping to BullMQ + Redis is a one-day refactor. Free tier 1M step fns/mo ≈ 20K docs/mo; overage is ~$0.40/1k steps |
| R11 | Inngest dev server must be running for local ingestion to work | `npm run dev:all` script starts it via `concurrently`; CI uses `@inngest/test` mocks |
| R12 | Inngest Cloud outage halts all ingestion | All `inngest.send()` calls wrapped in try/catch; on failure, fall back to synchronous `processDocument()` with a 60s Vercel function timeout (covers most small docs) |

---

## 11. Effort Estimate (sessions, 1 session = 2–3 h)

| Bucket | Sessions |
|---|---|
| §3 Bug fixes (B1–B13) | 4–5 |
| §4 RLS completion + tests | 3–4 |
| §5.1 Multi-tenant | 4–5 |
| §5.2 Documents | 4–5 |
| §5.3 Chat (dashboard) | 3–4 |
| §5.4 Citations & feedback | 3–4 |
| §5.5 Widget (loader, per-token, CRUD) | 5–6 |
| §5.6 Billing (usage, limits, reset, states, dunning, portal, alerts) | 6–7 |
| §5.7 Analytics page + PostHog | 2–3 |
| §5.8 Onboarding / UX polish | 3–4 |
| §5.9 Auth (reset, verify, Google OAuth, brute-force) | 3–4 |
| §6 Infrastructure (vercel.json, CI, Sentry, env, health) | 3–4 |
| §7 Compliance (consent, export, delete, legal pages) | 3–4 |
| §8 Tests (unit + integration + E2E) | 8–10 |
| **Total** | **~52–65 sessions** |

That's **~13–16 calendar weeks** on top of the v3.1 plan's 27–34 weeks, so total MVP-to-launch becomes **~40–50 weeks (~9.5–12 months)**. This is longer than the v3.1 number because the v3.1 number under-counted the unfinished work.

---

## 12. Resolved Decisions (locked in)

- **Error reporting:** Sentry (`@sentry/nextjs`)
- **OAuth:** Google only
- **DPA:** static "Contact us for DPA" page
- **Charts:** Recharts
- **Background jobs:** **Inngest** (`inngest` SDK) — event-driven for ingestion, cron for scheduled jobs
- **Vector search:** keep Pinecone + add native sparse encoder for hybrid (already in plan)
- **Reranker:** Voyage AI `rerank-2.5-lite`
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Database:** Supabase Postgres + Drizzle
- **Object storage:** Supabase Storage
- **Auth provider:** Supabase Auth
- **Billing:** Polar.sh
- **Rate limit:** Upstash Redis + `@upstash/ratelimit`
- **Email:** Resend
- **Analytics:** PostHog
