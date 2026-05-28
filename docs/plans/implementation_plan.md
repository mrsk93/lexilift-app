# LexiLift — RAG Knowledge-Base SaaS: Implementation Plan v3

> **Elevate your knowledge base with AI.**
> Upload docs → multi-tenant workspaces → embeddable chat widget with citations & source highlighting → Polar.sh gated plans.

---

## Market Context

| Metric | Value |
|---|---|
| **RAG Market Size** | $3.32B (2025) → $4.18B (2026) → $10.5B (2030) |
| **GenAI adopters using RAG** | 71% |
| **Upwork AI chatbot demand** | +71% YoY |
| **Expert RAG freelancer rates** | $125–$400/hr |
| **Primary target** | B2B SaaS companies |

### Competitive Landscape

| Competitor | Pricing | Strength | Weakness |
|---|---|---|---|
| Chatbase | $40–$500/mo | No-code, simple | Basic RAG quality |
| CustomGPT | $99–$499/mo | 1400+ formats, accuracy | Expensive jump to Pro |
| DocsBot | $49–$499/mo | Doc specialization | Limited enterprise features |
| Mendable | Free–custom | Dev-first, SOC 2 | Free tier very limited |
| Inkeep | $150–$500/mo | Dev-tool focused | Niche, expensive |
| Glean | $40–50/user/mo | Enterprise, 100+ connectors | $50K+ ACV minimum |

### LexiLift's Differentiation

1. **Multi-LLM choice** (OpenAI + Claude + Gemini) — Chatbase/DocsBot are OpenAI-only
2. **Dark, premium UI** — competitors all look generic/corporate
3. **Hybrid search + reranking** as baseline — Chatbase uses simple vector search
4. **Deep Search toggle** (v2) — Perplexity-style agentic RAG for complex queries
5. **Widget-first → White-label path** — captures both self-serve and agency markets
6. **Transparent hybrid pricing** — base subscription + usage, not opaque enterprise contracts

---

## Final Tech Stack (All Decisions)

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack, SSR, streaming, Server Actions |
| **Auth** | Supabase Auth + custom org management | No vendor lock-in; org/RBAC/invites built from scratch |
| **Database** | Supabase PostgreSQL | Unified with Auth + Storage; Drizzle ORM |
| **ORM** | Drizzle ORM | Type-safe, lightweight, edge-compatible |
| **Vector Store** | Pinecone (adapter pattern) | Free tier (2GB), managed, multi-tenant namespaces. Swappable. |
| **AI Orchestration** | LangChain.js (TypeScript) | Industry standard, largest ecosystem |
| **LLMs** | OpenAI GPT-4o + Anthropic Claude + Google Gemini | Multi-LLM via adapter pattern; user picks model |
| **Embeddings** | OpenAI text-embedding-3-small | $0.02/1M tokens, reliable |
| **File Storage** | Supabase Storage | Unified with DB + Auth |
| **Payments** | Polar.sh (adapter pattern) | 4% + $0.40, MoR, India payouts, Next.js SDK. Swappable to Lemon Squeezy. |
| **Reranking** | Voyage AI (rerank-2.5-lite) | 200M free tokens, top-tier quality, $0.02/1M tokens after |
| **Sparse Vectors** | Pinecone native sparse encoder | No bundle bloat, hybrid search built-in |
| **Deployment** | Vercel | Native Next.js host, Node.js runtime, zero-config, $20/mo Pro |
| **UI Components** | shadcn/ui + Tailwind CSS | Premium, customizable, owns the code |
| **Background Jobs** | Vercel Workflows | Durable execution, 800s timeout, step-level retries |
| **Rate Limiting** | Upstash Redis + @upstash/ratelimit | Serverless, Vercel-compatible, free 10K cmd/day |
| **Email** | Resend | Free 3K emails/mo, React email templates |
| **Analytics** | PostHog | Free 1M events/mo, session recordings, funnels |
| **Design** | Dark mode + violet/indigo accent | Premium, stands out from light-themed competitors |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        LexiLift SaaS                              │
│                                                                    │
│  ┌──────────────┐   ┌───────────────┐   ┌──────────────────────┐ │
│  │  Dashboard    │   │  Chat Widget  │   │  Public Widget API   │ │
│  │  (Next.js)    │   │  (embed <script>) │   │  (token-auth)     │ │
│  └──────┬───────┘   └───────┬───────┘   └──────────┬───────────┘ │
│         │                   │                       │              │
│  ┌──────▼───────────────────▼───────────────────────▼────────┐   │
│  │              Next.js API Routes (Vercel Functions)           │   │
│  │  /api/ingest  /api/query  /api/widget  /api/webhooks      │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                              │                                     │
│       ┌──────────────────────┼──────────────────────┐            │
│       ▼                      ▼                      ▼            │
│  ┌──────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │ LangChain│  │  Supabase            │  │  Polar.sh        │   │
│  │ RAG Chain│  │  (Auth+DB+Storage)   │  │  (Billing MoR)   │   │
│  └────┬─────┘  └──────────────────────┘  └──────────────────┘   │
│       │                                                           │
│  ┌────▼─────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Multi-LLM│  │  Pinecone    │  │  Upstash     │               │
│  │ Adapter  │  │  (vectors +  │  │  (rate limit)│               │
│  │ ┌───────┐│  │   sparse)    │  └──────────────┘               │
│  │ │OpenAI ││  └──────────────┘                                  │
│  │ │Claude ││  ┌──────────────┐  ┌──────────────┐               │
│  │ │Gemini ││  │ Vercel       │  │  Resend      │               │
│  │ └───────┘│  │ Workflows    │  │  (email)     │               │
│  └──────────┘  │ (bg jobs)    │  └──────────────┘               │
│  ┌──────────┐  └──────────────┘                                  │
│  │ Voyage AI│                     ┌──────────────┐               │
│  │ (rerank) │                     │  PostHog     │               │
│  └──────────┘                     │  (analytics) │               │
│                                    └──────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

### Adapter Pattern (Vendor Portability)

All external services use an **abstract interface + concrete implementation** pattern:

```typescript
// lib/adapters/vector-store/interface.ts
interface VectorStoreAdapter {
  upsert(chunks: Chunk[], namespace: string): Promise<void>
  query(embedding: number[], namespace: string, topK: number): Promise<Match[]>
  delete(ids: string[], namespace: string): Promise<void>
}

// lib/adapters/vector-store/pinecone.ts  ← current
// lib/adapters/vector-store/pgvector.ts  ← future swap
// lib/adapters/vector-store/qdrant.ts    ← future swap
```

Same pattern for: `LLMAdapter`, `RerankerAdapter`, `BillingAdapter`, `StorageAdapter`

---

## Feature Breakdown

### 1. Multi-Tenant Workspaces (Custom-Built on Supabase Auth)

Since we're building org management from scratch (no Clerk), we need:

**Tables:**
- `organizations` — workspace/tenant
- `memberships` — links users to orgs with roles (owner/admin/member)
- `invites` — pending team invitations

**Features to build:**
- Org creation, switching, deletion
- Team invite flow (email invite → accept → join org)
- Role-based access (Owner can manage billing, Admin can manage docs, Member can chat)
- RLS policies on every table scoped by `org_id`
- Org switcher UI component in sidebar

**Estimated effort:** ~9-11 working days (~2 weeks with testing and polish)

### 2. Document Ingestion Pipeline

```
User uploads PDF/DOCX/TXT/MD or pastes URL
  → File stored in Supabase Storage
  → Vercel Workflow triggered (durable, step-level retries):
    → Text extraction (pdf-parse for PDF, mammoth for DOCX, cheerio for URLs)
    → Chunking (RecursiveCharacterTextSplitter — 1000 tokens, 200 overlap)
    → Embeddings (OpenAI text-embedding-3-small, batched)
    → Stored in Pinecone (namespace = org_id, dense + sparse vectors)
    → Metadata stored in Supabase (doc_id, chunk_index, page_num)
  → Workflow step tracking (0% → 100%)
  → Document status updated to "ready"
```

**MVP document types:** PDF, DOCX, TXT/MD, Web URLs
**v1.1:** CSV/Excel, Notion
**v1.2:** Google Docs, YouTube

### 3. RAG Query & Chat (Hybrid Search + Reranking)

```
User message
  → Embed query (OpenAI text-embedding-3-small)
  → Pinecone hybrid search:
      → Vector similarity (semantic, dense embeddings)
      → Sparse/keyword matching (Pinecone native sparse encoder)
  → Rerank results (Voyage AI rerank-2.5-lite)
  → Top 5 chunks selected
  → Build context prompt with chunks + source metadata
  → LLM completion (user's chosen model: GPT-4o / Claude / Gemini)
  → Streaming response via Vercel AI SDK
  → Response includes inline citations [1][2] with:
      → Source document name
      → Page number
      → Relevant excerpt
  → Citations clickable → show source highlight overlay
```

**v2 upgrade:** "Deep Search" toggle → Agentic RAG (multi-step retrieval, sub-query decomposition, self-critique loop). Perplexity-style. Counts as 3-5x query credits.

### 4. Embeddable Chat Widget (MVP)

**Features (MVP — 5 core):**
- ✅ Inline citations with source highlighting
- ✅ Streaming responses (token-by-token)
- ✅ Chat history / conversation memory (per session)
- ✅ Custom branding (logo, primary color, welcome message)
- ✅ Thumbs up/down feedback

**v1.1:** Suggested follow-up questions, Multi-language support
**v1.2:** Human handoff via email escalation (no Intercom/Zendesk dependency)
**v2:** White-label (custom domains, full branding removal, agency-tier)

**Widget delivery:**
```html
<!-- Customer embeds this on their site -->
<script src="https://lexilift.vercel.app/widget.js" data-token="wt_abc123"></script>
```
- Loads sandboxed iframe from `lexilift.vercel.app/widget/[token]`
- Authenticates via public widget token (per workspace, rate-limited)
- CORS-restricted to allowed origins configured by workspace owner

### 5. Billing & Plans (Polar.sh)

#### Pricing Model: Hybrid (Base + Usage)

| Plan | Monthly | Included | Overage | Docs | Workspaces | Widget |
|---|---|---|---|---|---|---|
| **Starter** | Free | 500 queries/mo | Blocked | 10 | 1 | ❌ |
| **Pro** | $29/mo | 10K queries/mo | $0.005/query | 100 | 3 | ✅ (LexiLift branding) |
| **Team** | $79/mo | 50K queries/mo | $0.003/query | Unlimited | 10 | ✅ (Custom branding) |
| **Enterprise** | Custom | Unlimited | Custom | Unlimited | Unlimited | ✅ (White-label) |

**Polar.sh Integration:**
- Products + variants in Polar dashboard
- `@polar-sh/sdk` for checkout link generation
- Webhook `/api/webhooks/polar` handles: `subscription.created`, `subscription.updated`, `subscription.cancelled`
- Plan limits enforced via middleware on every API route
- Usage meter: query count tracked per org per billing cycle

---

## Database Schema (Supabase PostgreSQL + Drizzle ORM)

```sql
-- ========================================
-- AUTH & MULTI-TENANCY (custom-built)
-- ========================================

-- Organizations / Workspaces
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  plan          TEXT DEFAULT 'starter',         -- starter | pro | team | enterprise
  polar_customer_id    TEXT,
  polar_subscription_id TEXT,
  query_count   INT DEFAULT 0,
  query_limit   INT DEFAULT 500,
  query_reset_at TIMESTAMPTZ,
  created_by    UUID NOT NULL,                  -- Supabase auth.users.id
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Org Memberships
CREATE TABLE memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,                  -- Supabase auth.users.id
  role          TEXT DEFAULT 'member',          -- owner | admin | member
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Pending Invites
CREATE TABLE invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT DEFAULT 'member',
  invited_by    UUID NOT NULL,
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- User Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY,               -- = auth.users.id
  full_name     TEXT,
  avatar_url    TEXT,
  current_org_id UUID REFERENCES organizations(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- DOCUMENTS & RAG
-- ========================================

-- Documents
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  file_url      TEXT,
  file_type     TEXT NOT NULL,                  -- pdf | docx | txt | md | url
  source_url    TEXT,                           -- original URL if web-crawled
  status        TEXT DEFAULT 'processing',      -- processing | ready | failed
  error_message TEXT,
  chunk_count   INT DEFAULT 0,
  file_size     BIGINT,
  uploaded_by   UUID NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Document Chunks (metadata only — embeddings live in Pinecone)
CREATE TABLE document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  doc_id        UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  metadata      JSONB,                          -- { page_num, heading, char_start, char_end }
  pinecone_id   TEXT,                           -- ID in Pinecone for cross-reference
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chunks_org ON document_chunks(org_id);
CREATE INDEX idx_chunks_doc ON document_chunks(doc_id);

-- ========================================
-- CHAT
-- ========================================

-- Chat Sessions
CREATE TABLE chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID,                           -- null for anonymous widget users
  source        TEXT DEFAULT 'dashboard',       -- dashboard | widget
  title         TEXT,
  llm_model     TEXT DEFAULT 'gpt-4o',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,                  -- user | assistant
  content       TEXT NOT NULL,
  citations     JSONB,                          -- [{ chunk_id, doc_name, page_num, excerpt }]
  feedback      TEXT,                           -- thumbs_up | thumbs_down | null
  tokens_used   INT,
  latency_ms    INT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- WIDGET
-- ========================================

-- Widget Tokens
CREATE TABLE widget_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL,
  name          TEXT DEFAULT 'Default Widget',
  allowed_origins TEXT[],
  is_active     BOOLEAN DEFAULT true,
  -- Branding
  primary_color TEXT DEFAULT '#7c3aed',
  welcome_message TEXT DEFAULT 'Hi! Ask me anything about our docs.',
  logo_url      TEXT,
  -- Limits
  rate_limit_per_min INT DEFAULT 10,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## Project Directory Structure

```
lexilift/
├── app/
│   ├── (auth)/                    # Public auth pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts      # Supabase auth callback
│   ├── (dashboard)/               # Protected app (requires auth)
│   │   ├── layout.tsx             # Sidebar + org switcher + plan badge
│   │   ├── page.tsx               # Dashboard overview
│   │   ├── documents/
│   │   │   ├── page.tsx           # Document list + upload
│   │   │   └── [id]/page.tsx      # Document detail + chunks preview
│   │   ├── chat/
│   │   │   ├── page.tsx           # Chat interface
│   │   │   └── [sessionId]/page.tsx
│   │   ├── widget/
│   │   │   └── page.tsx           # Widget settings + embed code generator
│   │   ├── team/
│   │   │   └── page.tsx           # Members, invites, roles
│   │   ├── settings/
│   │   │   └── page.tsx           # Org settings, LLM preferences
│   │   ├── billing/
│   │   │   └── page.tsx           # Plan details, usage meter, upgrade
│   │   └── analytics/
│   │       └── page.tsx           # Query analytics, feedback, top questions
│   ├── widget/                    # Public embeddable widget
│   │   └── [token]/
│   │       └── page.tsx           # Sandboxed chat widget (iframe target)
│   └── api/
│       ├── auth/
│       │   └── callback/route.ts
│       ├── ingest/
│       │   └── route.ts           # Upload + trigger ingestion
│       ├── query/
│       │   └── route.ts           # RAG query (dashboard)
│       ├── widget/
│       │   └── query/route.ts     # RAG query (public widget, token-auth)
│       ├── organizations/
│       │   └── route.ts           # CRUD for orgs
│       ├── invites/
│       │   └── route.ts           # Team invite management
│       ├── billing/
│       │   └── checkout/route.ts  # Polar checkout link
│       └── webhooks/
│           └── polar/route.ts     # Polar subscription lifecycle
│
├── components/
│   ├── ui/                        # shadcn/ui base components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── OrgSwitcher.tsx
│   │   └── PlanBadge.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── CitationCard.tsx
│   │   ├── SourceHighlight.tsx
│   │   └── FeedbackButtons.tsx
│   ├── documents/
│   │   ├── UploadDropzone.tsx
│   │   ├── DocumentCard.tsx
│   │   ├── IngestionProgress.tsx
│   │   └── DocumentList.tsx
│   ├── widget/
│   │   ├── EmbedCodeSnippet.tsx
│   │   ├── WidgetPreview.tsx
│   │   └── WidgetSettings.tsx
│   ├── team/
│   │   ├── MemberList.tsx
│   │   ├── InviteModal.tsx
│   │   └── RoleBadge.tsx
│   └── billing/
│       ├── PricingTable.tsx
│       ├── UsageMeter.tsx
│       └── PlanCard.tsx
│
├── lib/
│   ├── adapters/                  # ← Vendor portability layer
│   │   ├── vector-store/
│   │   │   ├── interface.ts       # Abstract VectorStoreAdapter
│   │   │   └── pinecone.ts        # Pinecone implementation
│   │   ├── llm/
│   │   │   ├── interface.ts       # Abstract LLMAdapter
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   └── gemini.ts
│   │   ├── reranker/
│   │   │   ├── interface.ts       # Abstract RerankerAdapter
│   │   │   └── voyage.ts          # Voyage AI implementation
│   │   ├── billing/
│   │   │   ├── interface.ts       # Abstract BillingAdapter
│   │   │   └── polar.ts           # Polar.sh implementation
│   │   └── storage/
│   │       ├── interface.ts
│   │       └── supabase.ts
│   ├── langchain/
│   │   ├── rag-chain.ts               # Main RAG pipeline
│   │   ├── embeddings.ts              # Embedding utilities
│   │   ├── chunking.ts                # Text splitter config
│   │   └── retriever.ts               # Hybrid retrieval (dense + sparse)
│   ├── db/
│   │   ├── schema.ts                  # Drizzle schema definitions
│   │   ├── client.ts                  # Drizzle client setup
│   │   └── migrations/                # SQL migrations
│   ├── auth/
│   │   ├── supabase-client.ts         # Browser + server Supabase clients
│   │   ├── middleware.ts              # Auth + org context middleware
│   │   └── org-utils.ts               # Org management helpers
│   ├── rate-limit/
│   │   └── upstash.ts                 # Rate limiter setup
│   ├── parsers/
│   │   ├── pdf.ts                     # PDF text extraction
│   │   ├── docx.ts                    # DOCX extraction
│   │   ├── text.ts                    # TXT/MD passthrough
│   │   └── url.ts                     # Web URL crawler
│   └── email/
│       └── resend.ts                  # Email templates + sending
│
├── workflows/                     # Vercel Workflows
│   └── ingestion.ts              # Durable document processing workflow
│
├── middleware.ts                   # Next.js middleware (auth guard + org context)
├── drizzle.config.ts
├── tailwind.config.ts
├── vercel.json                    # Vercel configuration
└── package.json
```

---

## Phased Development Roadmap

> [!IMPORTANT]
> **Developer profile:** Solo developer, side project (~2-3 hours/day, evenings/weekends).
> **Session** = one work session of ~2-3 hours. **Calendar weeks** assume ~4-5 sessions/week.
> **Total estimate:** ~85-104 sessions → **~27-34 calendar weeks (~7-8 months)** to MVP launch.

### Phase 1 — Foundation (Sessions: ~20-25 | Calendar: Week 1–8)

**Milestone:** Authenticated dashboard with multi-tenant org management, dark theme UI, and adapter scaffolding. No AI features yet.

#### 1a. Project Setup (~3 sessions)
- [ ] Next.js 14 (App Router) + TypeScript + ESLint + Prettier
- [ ] Tailwind CSS + shadcn/ui (dark theme, violet/indigo accent palette)
- [ ] Vercel deployment + preview deploys on push
- [ ] Central `lib/env.ts` for typed environment variables
- [ ] Vitest setup for unit testing

#### 1b. Database + ORM (~3 sessions)
- [ ] Supabase project connection + `DATABASE_URL` config
- [ ] Drizzle ORM setup (`drizzle.config.ts`, client)
- [ ] Schema definitions: organizations, memberships, invites, profiles
- [ ] Schema definitions: documents, document_chunks, chat_sessions, chat_messages, widget_tokens
- [ ] Initial migration (`drizzle-kit push`)

#### 1c. Auth Flow (~4 sessions)
- [ ] Supabase Auth client (browser `createBrowserClient` + server `createServerClient`)
- [ ] Signup page (email/password)
- [ ] Login page
- [ ] Auth callback route (`/api/auth/callback`)
- [ ] Protected route middleware (redirect unauthenticated → `/login`)
- [ ] Auto-create profile + default org on first signup (via DB trigger or post-signup logic)

#### 1d. Custom Org Management (~8 sessions) — largest chunk
- [ ] Create organization API (auto-create `owner` membership)
- [ ] Org switching (update `profiles.current_org_id`)
- [ ] Team invite flow:
  - [ ] Send invite (create invite row, send email via Resend)
  - [ ] Accept invite (create membership, mark invite `accepted_at`)
  - [ ] Edge cases: existing user, new user, expired, already member, revocation
- [ ] Role-based access helpers (`isOwner`, `isAdmin`, `isMember`)
- [ ] **RLS policies** on ALL tables (organizations, memberships, invites, documents, etc.)
  - Scoped by `org_id` via membership subquery
  - Separate policies per operation (SELECT, INSERT, UPDATE, DELETE)
  - Tests to verify cross-tenant isolation

#### 1e. Dashboard Layout (~3 sessions)
- [ ] Sidebar with nav links (Documents, Chat, Widget, Team, Settings, Billing, Analytics)
- [ ] Org switcher dropdown in sidebar
- [ ] Plan badge showing current plan (Starter/Pro/Team)
- [ ] Responsive sidebar (collapsible on mobile)

#### 1f. Adapter Pattern Scaffolding (~2 sessions)
- [ ] Abstract interfaces: `VectorStoreAdapter`, `LLMAdapter`, `RerankerAdapter`, `BillingAdapter`, `StorageAdapter`
- [ ] Placeholder implementations (throw "not implemented")
- [ ] Factory functions returning concrete adapter based on env config

---

### Phase 2 — Ingestion Pipeline (Sessions: ~12-15 | Calendar: Week 9–13)

**Milestone:** Users can upload PDFs/DOCX/TXT/URLs, documents are chunked, embedded, and stored in Pinecone with both dense and sparse vectors.

#### 2a. File Upload UI (~3 sessions)
- [ ] Drag-and-drop upload component (`UploadDropzone.tsx`)
- [ ] Multi-file upload support with file type validation
- [ ] Upload progress bar (per file)
- [ ] Supabase Storage integration (upload to `documents/{org_id}/`)

#### 2b. Ingestion Workflow (~5 sessions)
- [ ] Vercel Workflow definition (`workflows/ingestion.ts`)
- [ ] Step 1: Text extraction
  - [ ] PDF parser (`pdf-parse`)
  - [ ] DOCX parser (`mammoth`)
  - [ ] TXT/MD passthrough
  - [ ] URL crawler (`cheerio`)
- [ ] Step 2: Chunking (LangChain `RecursiveCharacterTextSplitter`, 1000 tokens, 200 overlap)
- [ ] Step 3: Embedding (OpenAI `text-embedding-3-small`, batched)
- [ ] Step 4: Store in Pinecone (namespace = `org_id`, dense + Pinecone sparse encoder)
- [ ] Step 5: Store chunk metadata in Supabase (`document_chunks` table)
- [ ] Error handling + retry logic per step

#### 2c. Document Management (~4 sessions)
- [ ] Document list page with status indicators (processing/ready/failed)
- [ ] Document detail page with chunk preview
- [ ] Delete document (cascade: Supabase chunks + Pinecone vectors)
- [ ] Re-process failed documents
- [ ] Real-time status polling / webhook for ingestion progress

---

### Phase 3 — RAG Chat (Sessions: ~18-22 | Calendar: Week 14–20)

**Milestone:** Fully functional chat interface with hybrid search, reranking, multi-LLM support, streaming responses, and inline citations.

#### 3a. Multi-LLM Adapter (~4 sessions)
- [ ] `LLMAdapter` interface: `chat(messages, options) → AsyncIterable<string>`
- [ ] OpenAI adapter (`@langchain/openai` or Vercel AI SDK)
- [ ] Anthropic adapter (`@langchain/anthropic` or Vercel AI SDK)
- [ ] Gemini adapter (`@langchain/google-genai` or Vercel AI SDK)
- [ ] LLM model selector in settings (per-org preference)

#### 3b. RAG Pipeline (~6 sessions)
- [ ] LangChain RAG chain (`lib/langchain/rag-chain.ts`)
- [ ] Hybrid Pinecone retriever (dense + sparse query)
- [ ] Voyage AI reranker integration (`lib/adapters/reranker/voyage.ts`)
- [ ] Context prompt builder (chunks + source metadata → system prompt)
- [ ] Citation extraction from LLM response (parse `[1]`, `[2]` references)
- [ ] RAG query API route (`/api/query/route.ts`)

#### 3c. Chat UI (~6 sessions)
- [ ] Streaming chat interface (Vercel AI SDK `useChat` hook)
- [ ] `ChatWindow.tsx` with message list + input
- [ ] `MessageBubble.tsx` (user/assistant with markdown rendering)
- [ ] `CitationCard.tsx` (source doc, page number, excerpt)
- [ ] `SourceHighlight.tsx` (overlay showing relevant passage in document)
- [ ] `FeedbackButtons.tsx` (thumbs up/down per message)

#### 3d. Chat Management (~4 sessions)
- [ ] Chat session creation + listing
- [ ] Chat history per session (stored in `chat_messages` table)
- [ ] Session title auto-generation (from first user message)
- [ ] Delete session
- [ ] LLM model selector in chat header

---

### Phase 4 — Embeddable Widget (Sessions: ~12-15 | Calendar: Week 21–25)

**Milestone:** Customers can embed a branded chat widget on their website via `<script>` tag, with rate limiting and CORS.

#### 4a. Widget Backend (~5 sessions)
- [ ] Widget token generation (crypto random, stored in `widget_tokens`)
- [ ] Widget API route (`/api/widget/query/route.ts`) — token-auth
- [ ] Allowed origins validation (CORS check against `widget_tokens.allowed_origins`)
- [ ] Upstash rate limiting (per-token + per-IP, `@upstash/ratelimit`)
- [ ] Widget token management API (create, update, revoke)

#### 4b. Widget Frontend (~5 sessions)
- [ ] Public widget page (`/widget/[token]/page.tsx`) — sandboxed iframe target
- [ ] Widget chat UI (minimal, branded version of the chat interface)
- [ ] Streaming responses in widget
- [ ] Widget JavaScript snippet (`widget.js`) that creates iframe on customer's page
- [ ] Custom branding support (primary color, logo, welcome message from `widget_tokens`)

#### 4c. Widget Dashboard (~3 sessions)
- [ ] Widget settings page in dashboard
- [ ] Embed code snippet generator (`EmbedCodeSnippet.tsx`)
- [ ] Widget preview component (`WidgetPreview.tsx`)
- [ ] Allowed origins management UI

---

### Phase 5 — Billing & Plans (Sessions: ~12-15 | Calendar: Week 26–30)

**Milestone:** Polar.sh integration with plan gating, usage tracking, upgrade flow, and overage handling.

#### 5a. Polar.sh Integration (~5 sessions)
- [ ] Polar.sh products + variants setup (Starter/Pro/Team)
- [ ] `BillingAdapter` implementation (`lib/adapters/billing/polar.ts`)
- [ ] Checkout link generation per plan
- [ ] Webhook handler (`/api/webhooks/polar/route.ts`):
  - [ ] `subscription.created` → upgrade org plan
  - [ ] `subscription.updated` → change plan
  - [ ] `subscription.cancelled` → downgrade to Starter

#### 5b. Plan Enforcement (~5 sessions)
- [ ] Plan limits middleware on every API route:
  - [ ] Query count per org per billing cycle
  - [ ] Document count limit
  - [ ] Workspace count limit
  - [ ] Widget access (Pro+ only)
- [ ] Usage tracking: increment `organizations.query_count` on each query
- [ ] Monthly reset via scheduled job or on-demand check
- [ ] Overage handling (block + show upgrade prompt)

#### 5c. Billing UI (~3 sessions)
- [ ] Pricing comparison page (`PricingTable.tsx`)
- [ ] Current plan details + usage meter (`UsageMeter.tsx`)
- [ ] Upgrade/downgrade flow
- [ ] Usage alerts (approaching limit → show banner)

---

### Phase 6 — Polish & Ship (Sessions: ~10-12 | Calendar: Week 31–34)

**Milestone:** Production-ready MVP with onboarding, emails, analytics, error handling, and security audit.

#### 6a. Onboarding & UX (~4 sessions)
- [ ] Empty states for all pages (documents, chat, team, analytics)
- [ ] Guided first-run flow (create org → upload first doc → try chat)
- [ ] Loading skeletons + error boundaries on all pages
- [ ] Responsive design audit + fixes

#### 6b. Email & Analytics (~3 sessions)
- [ ] Resend email templates: welcome, invite, usage alerts
- [ ] PostHog integration: key events (signup, upload, query, upgrade)
- [ ] Session recordings setup

#### 6c. Analytics Page & Security (~4 sessions)
- [ ] Query analytics dashboard (top questions, success rate, feedback breakdown)
- [ ] Security audit:
  - [ ] RLS policies: attempt cross-tenant data access via API
  - [ ] CORS: verify widget only works from allowed origins
  - [ ] Rate limits: verify enforcement
  - [ ] Input sanitization: XSS, SQL injection checks

---

### Post-MVP Roadmap

**v1.1 (Month 4):**
- Suggested follow-up questions in widget
- Multi-language support (auto-detect + respond in same language)
- CSV/Excel document support
- Notion integration

**v1.2 (Month 5):**
- Human handoff via email escalation
- Google Docs integration
- YouTube transcript ingestion
- Advanced analytics (conversation funnels, knowledge gaps)

**v2 (Month 6-8):**
- 🎯 Landing page / marketing site
- 🔍 "Deep Search" toggle (Agentic RAG — Perplexity-style)
- 🏷️ White-label mode (custom domains, full branding removal)
- 🔗 API access for power users
- 📊 Team analytics + admin dashboard

---

## Environment Variables

```env
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Database ──
DATABASE_URL=                      # Supabase Postgres connection string

# ── OpenAI ──
OPENAI_API_KEY=

# ── Anthropic ──
ANTHROPIC_API_KEY=

# ── Google AI ──
GOOGLE_GENERATIVE_AI_API_KEY=

# ── Pinecone ──
PINECONE_API_KEY=
PINECONE_INDEX=
PINECONE_ENVIRONMENT=

# ── Polar.sh ──
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_ORG_ID=
POLAR_PRO_PRODUCT_ID=
POLAR_TEAM_PRODUCT_ID=

# ── Upstash Redis ──
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ── Resend ──
RESEND_API_KEY=

# ── PostHog ──
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# ── Voyage AI (Reranking) ──
VOYAGE_API_KEY=

# ── App ──
NEXT_PUBLIC_APP_URL=https://lexilift.vercel.app
```

---

## Estimated Monthly Costs

### During Development (Free Tiers)

| Service | Free Tier |
|---|---|
| Vercel | Hobby: free (100GB bandwidth, 1M functions) |
| Supabase | 500MB DB, 1GB storage, 50K MAU |
| Pinecone | 2GB, ~350K vectors |
| Voyage AI (reranking) | **200M free tokens** (~36K rerank requests) |
| OpenAI | Pay-as-you-go (~$5 during dev) |
| Anthropic | Pay-as-you-go (~$5 during dev) |
| Upstash Redis | 10K commands/day |
| Resend | 3K emails/mo |
| PostHog | 1M events/mo |
| Polar.sh | $0 (4% only on transactions) |
| **Total during dev** | **~$10** (just LLM API testing) |

### At Launch (~100 customers)

| Service | Estimated Cost |
|---|---|
| Vercel (Pro) | $20/mo |
| Supabase (Pro) | $25/mo |
| Pinecone (Starter) | Free → $70/mo if scaling |
| Voyage AI (reranking) | ~$5/mo (after free tier) |
| OpenAI API | ~$50-150/mo (depends on query volume) |
| Anthropic API | ~$20-50/mo |
| Upstash Redis | $10/mo |
| Resend | $20/mo |
| PostHog | Free |
| **Total at launch** | **~$150-350/mo** |

### Revenue Target (to break even)
- 5 Pro customers ($29 × 5 = $145/mo) → covers minimum costs
- 10 Pro + 2 Team ($290 + $158 = $448/mo) → profitable

---

## Resolved Architecture Decisions

> [!TIP]
> **Reranker: Voyage AI (rerank-2.5-lite)**
> 200M free tokens (~36K rerank requests). After free tier: $0.02/1M tokens. Top-tier accuracy, outperforms Cohere on NDCG@10 benchmarks. Simple REST API, no commercial restrictions on free tier. Strategy: Use Cohere free 1K calls/month during dev → switch to Voyage AI for production.

> [!TIP]
> **Sparse Vectors: Pinecone Native Sparse Encoder**
> No BM25 package bundled in our functions. Pinecone handles both dense (semantic) and sparse (keyword) vectors natively. Simpler architecture, no bundle size or timeout concerns.

> [!TIP]
> **Deployment: Vercel (replacing Cloudflare Workers)**
> Full Node.js runtime means `pdf-parse`, `mammoth.js`, and all LangChain.js packages work natively. Vercel Workflows for durable document processing (800s timeout, step-level retries). Zero-config deployment (`git push` → done). Native Supabase + Pinecone marketplace integrations. $20/mo Pro — the $15/mo premium over Cloudflare is trivially offset by weeks of saved engineering time.

> [!TIP]
> **Multi-Tenancy: Supabase Custom-Built (Clerk rejected)**
> After honest complexity analysis: RBAC (2-3 days), Invites (3-4 days), Org Switching (1 day), Billing (2-3 days) = ~9-11 days total. None are genuinely hard engineering problems. The original 2-3 week estimate was slightly alarmist. Clerk's vendor lock-in + pricing ($25-99/mo) not justified for this complexity level.

---

## Verification Plan

### Automated Tests
- Unit tests for RAG pipeline (chunking, embedding, retrieval accuracy)
- Integration tests for auth flow (signup → create org → invite → join)
- API endpoint tests (query, widget, webhooks)
- Rate limiting tests (verify blocks above threshold)
- Plan limits tests (verify enforcement)

### Manual Verification
- Upload 10+ diverse PDFs → verify ingestion + chunk quality
- Compare RAG answer quality across all 3 LLMs
- Test widget embed on external HTML page
- End-to-end billing flow (free → Pro upgrade → usage tracking → overage)
- Security audit: attempt to access other org's data via API

---

*Plan version: 3.1 — May 2026*
*Decisions made via /grill-me interview: 15+ design decisions resolved*
*v3 updates: Vercel deployment, Voyage AI reranking, Pinecone sparse encoder, multi-tenancy effort revised*
*v3.1 updates: Timelines recalculated for solo dev (2-3 hrs/day) — ~7-8 months to MVP. Phase 1 detailed execution plan created.*
