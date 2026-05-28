# Phase 1 — Foundation: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete foundation for LexiLift — authenticated Next.js app with multi-tenant org management, dark-themed dashboard, and adapter scaffolding for all external services.

**Architecture:** Next.js 14 App Router on Vercel, Supabase (Auth + PostgreSQL + Storage), Drizzle ORM for type-safe DB access. Custom multi-tenancy with organizations, memberships, invites, and RLS policies. Adapter pattern for vendor portability.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, Supabase Auth, Supabase PostgreSQL, Vitest, Resend, Vercel

---

## Task 1: Project Setup + Tooling

**Files:**
- Create: `package.json` (via `create-next-app`)
- Create: `tailwind.config.ts`
- Create: `lib/env.ts`
- Create: `vitest.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Create Next.js project**

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Expected: Project scaffolded in current directory with App Router.

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm @supabase/supabase-js @supabase/ssr postgres dotenv zod
npm install -D drizzle-kit vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom prettier eslint-config-prettier
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx -y shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then install initial components:

```bash
npx -y shadcn@latest add button card input label dialog dropdown-menu avatar badge separator sheet toast
```

- [ ] **Step 4: Configure dark theme with violet/indigo accent**

Update `app/globals.css` — replace the `:root` and `.dark` CSS variable blocks:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 263 70% 50%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 263 70% 50%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 5.5%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 5.5%;
    --popover-foreground: 0 0% 98%;
    --primary: 263 70% 58%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 263 70% 58%;
  }
}
```

Add `className="dark"` to the `<html>` tag in `app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Create typed environment variables**

Create `lib/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Google AI
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),

  // Pinecone
  PINECONE_API_KEY: z.string().min(1).optional(),
  PINECONE_INDEX: z.string().min(1).optional(),
  PINECONE_ENVIRONMENT: z.string().min(1).optional(),

  // Voyage AI
  VOYAGE_API_KEY: z.string().min(1).optional(),

  // Polar.sh
  POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
  POLAR_ORG_ID: z.string().min(1).optional(),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Resend
  RESEND_API_KEY: z.string().min(1).optional(),

  // PostHog
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

// Only validate on server side
export const env = envSchema.parse(process.env);
```

- [ ] **Step 6: Create `.env.local` template**

Create `.env.local`:

```env
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Database ──
DATABASE_URL=your-supabase-postgres-connection-string

# ── Resend ──
RESEND_API_KEY=your-resend-key

# ── App ──
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add `.env.local` to `.gitignore` (it should already be there from create-next-app).

- [ ] **Step 7: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

Add test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 8: Verify setup runs**

```bash
npm run dev
```

Expected: App runs on http://localhost:3000 with dark theme.

```bash
npm run test:run
```

Expected: Vitest runs (0 tests, no errors).

- [ ] **Step 9: Initial commit**

```bash
git add -A
git commit -m "chore: project setup - Next.js 14, Tailwind, shadcn/ui, dark theme, Vitest"
```

---

## Task 2: Database + Drizzle ORM Schema

**Files:**
- Create: `drizzle.config.ts`
- Create: `lib/db/client.ts`
- Create: `lib/db/schema.ts`
- Test: `lib/db/__tests__/schema.test.ts`

- [ ] **Step 1: Write schema test (TDD — test first)**

Create `lib/db/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as schema from '../schema';

describe('Database Schema', () => {
  it('exports organizations table', () => {
    expect(schema.organizations).toBeDefined();
    expect(schema.organizations._.name).toBe('organizations');
  });

  it('exports memberships table', () => {
    expect(schema.memberships).toBeDefined();
    expect(schema.memberships._.name).toBe('memberships');
  });

  it('exports invites table', () => {
    expect(schema.invites).toBeDefined();
    expect(schema.invites._.name).toBe('invites');
  });

  it('exports profiles table', () => {
    expect(schema.profiles).toBeDefined();
    expect(schema.profiles._.name).toBe('profiles');
  });

  it('exports documents table', () => {
    expect(schema.documents).toBeDefined();
    expect(schema.documents._.name).toBe('documents');
  });

  it('exports document_chunks table', () => {
    expect(schema.documentChunks).toBeDefined();
    expect(schema.documentChunks._.name).toBe('document_chunks');
  });

  it('exports chat_sessions table', () => {
    expect(schema.chatSessions).toBeDefined();
    expect(schema.chatSessions._.name).toBe('chat_sessions');
  });

  it('exports chat_messages table', () => {
    expect(schema.chatMessages).toBeDefined();
    expect(schema.chatMessages._.name).toBe('chat_messages');
  });

  it('exports widget_tokens table', () => {
    expect(schema.widgetTokens).toBeDefined();
    expect(schema.widgetTokens._.name).toBe('widget_tokens');
  });

  it('defines plan enum values on organizations', () => {
    // Verify the plan column exists
    expect(schema.organizations.plan).toBeDefined();
  });

  it('defines role enum values on memberships', () => {
    expect(schema.memberships.role).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- lib/db/__tests__/schema.test.ts
```

Expected: FAIL — `Cannot find module '../schema'`

- [ ] **Step 3: Create Drizzle schema**

Create `lib/db/schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ========================================
// AUTH & MULTI-TENANCY
// ========================================

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  plan: text('plan').default('starter').notNull(), // starter | pro | team | enterprise
  polarCustomerId: text('polar_customer_id'),
  polarSubscriptionId: text('polar_subscription_id'),
  queryCount: integer('query_count').default(0).notNull(),
  queryLimit: integer('query_limit').default(500).notNull(),
  queryResetAt: timestamp('query_reset_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').notNull(),
    role: text('role').default('member').notNull(), // owner | admin | member
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('memberships_org_user_unique').on(table.orgId, table.userId)]
);

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  role: text('role').default('member').notNull(),
  invitedBy: uuid('invited_by').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // = auth.users.id
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  currentOrgId: uuid('current_org_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// DOCUMENTS & RAG
// ========================================

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  fileUrl: text('file_url'),
  fileType: text('file_type').notNull(), // pdf | docx | txt | md | url
  sourceUrl: text('source_url'),
  status: text('status').default('processing').notNull(), // processing | ready | failed
  errorMessage: text('error_message'),
  chunkCount: integer('chunk_count').default(0).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    docId: uuid('doc_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'), // { page_num, heading, char_start, char_end }
    pineconeId: text('pinecone_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chunks_org').on(table.orgId),
    index('idx_chunks_doc').on(table.docId),
  ]
);

// ========================================
// CHAT
// ========================================

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id'),
  source: text('source').default('dashboard').notNull(), // dashboard | widget
  title: text('title'),
  llmModel: text('llm_model').default('gpt-4o').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => chatSessions.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // user | assistant
  content: text('content').notNull(),
  citations: jsonb('citations'), // [{ chunk_id, doc_name, page_num, excerpt }]
  feedback: text('feedback'), // thumbs_up | thumbs_down | null
  tokensUsed: integer('tokens_used'),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// WIDGET
// ========================================

export const widgetTokens = pgTable('widget_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').unique().notNull(),
  name: text('name').default('Default Widget').notNull(),
  allowedOrigins: text('allowed_origins').array(),
  isActive: boolean('is_active').default(true).notNull(),
  primaryColor: text('primary_color').default('#7c3aed').notNull(),
  welcomeMessage: text('welcome_message')
    .default('Hi! Ask me anything about our docs.')
    .notNull(),
  logoUrl: text('logo_url'),
  rateLimitPerMin: integer('rate_limit_per_min').default(10).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// RELATIONS (for Drizzle query API)
// ========================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  invites: many(invites),
  documents: many(documents),
  chatSessions: many(chatSessions),
  widgetTokens: many(widgetTokens),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.orgId],
    references: [organizations.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [documents.orgId],
    references: [organizations.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.docId],
    references: [documents.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chatSessions.orgId],
    references: [organizations.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// ========================================
// TYPE EXPORTS
// ========================================

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type WidgetToken = typeof widgetTokens.$inferSelect;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- lib/db/__tests__/schema.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Create Drizzle client**

Create `lib/db/client.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For query purposes (connection pooling)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
```

- [ ] **Step 6: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 7: Generate and push initial migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: Tables created in Supabase PostgreSQL. Verify in Supabase Dashboard → Table Editor.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: database schema - all tables, relations, Drizzle ORM setup"
```

---

## Task 3: Supabase Auth Client Setup

**Files:**
- Create: `lib/auth/supabase-client.ts`
- Create: `lib/auth/supabase-server.ts`
- Create: `lib/auth/supabase-middleware.ts`
- Test: `lib/auth/__tests__/supabase-client.test.ts`

- [ ] **Step 1: Install Supabase SSR package**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Write test for client exports**

Create `lib/auth/__tests__/supabase-client.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Supabase Client', () => {
  it('exports createBrowserClient function', async () => {
    const mod = await import('../supabase-client');
    expect(mod.createClient).toBeDefined();
    expect(typeof mod.createClient).toBe('function');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:run -- lib/auth/__tests__/supabase-client.test.ts
```

Expected: FAIL — cannot find module.

- [ ] **Step 4: Create browser client**

Create `lib/auth/supabase-client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 5: Create server client**

Create `lib/auth/supabase-server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie setting not available
          }
        },
      },
    }
  );
}
```

- [ ] **Step 6: Create middleware client**

Create `lib/auth/supabase-middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes — redirect to login if not authenticated
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup');
  const isPublicRoute =
    isAuthPage ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/api/webhooks') ||
    request.nextUrl.pathname.startsWith('/widget') ||
    request.nextUrl.pathname.startsWith('/api/widget');

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 7: Create Next.js middleware**

Create `middleware.ts` (project root):

```typescript
import { updateSession } from '@/lib/auth/supabase-middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 8: Run tests**

```bash
npm run test:run -- lib/auth/__tests__/supabase-client.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Supabase Auth client setup - browser, server, middleware"
```

---

## Task 4: Auth Pages (Login + Signup + Callback)

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `app/api/auth/callback/route.ts`

- [ ] **Step 1: Create auth layout**

Create `app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            LexiLift
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Elevate your knowledge base with AI
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create signup page**

Create `app/(auth)/signup/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/auth/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Check your email for a confirmation link to complete your signup.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: Create login page**

Create `app/(auth)/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Create auth callback route**

Create `app/api/auth/callback/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

- [ ] **Step 5: Verify auth flow manually**

```bash
npm run dev
```

1. Open http://localhost:3000/signup
2. Create a test account
3. Check email for confirmation link
4. Click link → should redirect to dashboard
5. Open http://localhost:3000/login
6. Login with test account → should redirect to dashboard

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: auth flow - signup, login, callback, protected routes middleware"
```

---

## Task 5: Auto-Create Profile + Default Org on Signup

**Files:**
- Create: `lib/auth/org-utils.ts`
- Test: `lib/auth/__tests__/org-utils.test.ts`

- [ ] **Step 1: Write test for org creation utility**

Create `lib/auth/__tests__/org-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateSlug } from '../org-utils';

describe('Org Utils', () => {
  it('generates a URL-safe slug from org name', () => {
    expect(generateSlug('My Cool Org')).toBe('my-cool-org');
  });

  it('strips special characters from slug', () => {
    expect(generateSlug("John's Workspace!")).toBe('johns-workspace');
  });

  it('handles empty name by generating fallback', () => {
    const slug = generateSlug('');
    expect(slug).toMatch(/^org-/);
  });

  it('appends random suffix for uniqueness', () => {
    const slug1 = generateSlug('Test Org', true);
    const slug2 = generateSlug('Test Org', true);
    expect(slug1).not.toBe(slug2);
    expect(slug1).toMatch(/^test-org-[a-z0-9]+$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- lib/auth/__tests__/org-utils.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement org utils**

Create `lib/auth/org-utils.ts`:

```typescript
import { db } from '@/lib/db/client';
import { organizations, memberships, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Generate a URL-safe slug from a name.
 * @param name - The org name
 * @param withSuffix - Append random suffix for uniqueness
 */
export function generateSlug(name: string, withSuffix = false): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  if (!slug) {
    slug = 'org';
  }

  if (withSuffix) {
    const suffix = crypto.randomBytes(3).toString('hex');
    slug = `${slug}-${suffix}`;
  }

  return slug;
}

/**
 * Create a new organization and the owner membership.
 * Returns the created org.
 */
export async function createOrganization(userId: string, name: string) {
  const slug = generateSlug(name, true);

  const [org] = await db
    .insert(organizations)
    .values({
      name,
      slug,
      createdBy: userId,
    })
    .returning();

  // Create owner membership
  await db.insert(memberships).values({
    orgId: org.id,
    userId,
    role: 'owner',
  });

  return org;
}

/**
 * Ensure a profile exists for the user.
 * If not, create one and a default org.
 * Called after first login / signup confirmation.
 */
export async function ensureProfileAndOrg(
  userId: string,
  fullName?: string | null
) {
  // Check if profile exists
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (existing) {
    return existing;
  }

  // Create default org
  const org = await createOrganization(
    userId,
    fullName ? `${fullName}'s Workspace` : 'My Workspace'
  );

  // Create profile pointing to default org
  const [profile] = await db
    .insert(profiles)
    .values({
      id: userId,
      fullName: fullName ?? null,
      currentOrgId: org.id,
    })
    .returning();

  return profile;
}

/**
 * Get the user's current org ID from their profile.
 */
export async function getCurrentOrgId(userId: string): Promise<string | null> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
  return profile?.currentOrgId ?? null;
}

/**
 * Switch the user's active org.
 * Verifies user is a member of the target org before switching.
 */
export async function switchOrg(userId: string, orgId: string): Promise<boolean> {
  // Verify membership
  const membership = await db.query.memberships.findFirst({
    where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.orgId, orgId)),
  });

  if (!membership) {
    return false;
  }

  await db
    .update(profiles)
    .set({ currentOrgId: orgId })
    .where(eq(profiles.id, userId));

  return true;
}

/**
 * Check the user's role in an org.
 */
export async function getUserRole(
  userId: string,
  orgId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  const membership = await db.query.memberships.findFirst({
    where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.orgId, orgId)),
  });
  return (membership?.role as 'owner' | 'admin' | 'member') ?? null;
}

export function isOwner(role: string | null): boolean {
  return role === 'owner';
}

export function isAdmin(role: string | null): boolean {
  return role === 'owner' || role === 'admin';
}

export function isMember(role: string | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run -- lib/auth/__tests__/org-utils.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Wire up auto-profile creation on auth callback**

Update `app/api/auth/callback/route.ts` to call `ensureProfileAndOrg` after successful code exchange:

```typescript
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { ensureProfileAndOrg } from '@/lib/auth/org-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure profile + default org exist
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureProfileAndOrg(
          user.id,
          user.user_metadata?.full_name ?? null
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: auto-create profile + default org on first login"
```

---

## Task 6: RLS Policies (Row Level Security)

**Files:**
- Create: `lib/db/migrations/rls-policies.sql`

> **Important context for the developer:** RLS (Row Level Security) is a PostgreSQL feature that restricts which rows a user can see/modify based on their identity. In Supabase, `auth.uid()` returns the current user's ID. We use this to ensure users can ONLY access data belonging to organizations they're a member of.
>
> RLS policies are applied at the DATABASE level — even if your application code has a bug, the database itself will block unauthorized access. This is your last line of defense.
>
> **How it works:** For every table, we enable RLS and create policies. Each policy has:
> - A **command** (SELECT, INSERT, UPDATE, DELETE)
> - A **USING** clause (filters which existing rows the user can see/modify)
> - A **WITH CHECK** clause (validates new/modified rows — only for INSERT/UPDATE)

- [ ] **Step 1: Create RLS policies SQL migration**

Create `lib/db/migrations/rls-policies.sql`:

```sql
-- ============================================
-- RLS POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================
-- 
-- IMPORTANT: These policies use a helper pattern:
-- A user can access a row if they have a membership
-- in the org that owns that row.
--
-- Execute this file in the Supabase SQL Editor.
-- ============================================

-- ── Helper function: check if user is a member of an org ──
CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: check if user has a specific role ──
CREATE OR REPLACE FUNCTION has_org_role(check_org_id UUID, check_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
    AND role = check_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper function: check if user is admin or owner ──
CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- ORGANIZATIONS
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Members can view their orgs
CREATE POLICY "orgs_select_member" ON organizations
  FOR SELECT USING (is_org_member(id));

-- Any authenticated user can create an org
CREATE POLICY "orgs_insert_auth" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only owner can update org
CREATE POLICY "orgs_update_owner" ON organizations
  FOR UPDATE USING (has_org_role(id, 'owner'))
  WITH CHECK (has_org_role(id, 'owner'));

-- Only owner can delete org
CREATE POLICY "orgs_delete_owner" ON organizations
  FOR DELETE USING (has_org_role(id, 'owner'));

-- ============================================
-- MEMBERSHIPS
-- ============================================
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their orgs
CREATE POLICY "memberships_select_member" ON memberships
  FOR SELECT USING (is_org_member(org_id));

-- Admins/owners can add members
CREATE POLICY "memberships_insert_admin" ON memberships
  FOR INSERT WITH CHECK (is_org_admin(org_id));

-- Admins/owners can update member roles
CREATE POLICY "memberships_update_admin" ON memberships
  FOR UPDATE USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- Admins/owners can remove members; members can remove themselves
CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE USING (
    is_org_admin(org_id) OR user_id = auth.uid()
  );

-- ============================================
-- INVITES
-- ============================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Members can see invites for their orgs
CREATE POLICY "invites_select_member" ON invites
  FOR SELECT USING (is_org_member(org_id));

-- Admins can create invites
CREATE POLICY "invites_insert_admin" ON invites
  FOR INSERT WITH CHECK (is_org_admin(org_id));

-- Admins can update invites (e.g., mark as accepted)
CREATE POLICY "invites_update_admin" ON invites
  FOR UPDATE USING (is_org_admin(org_id));

-- Admins can delete invites
CREATE POLICY "invites_delete_admin" ON invites
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================
-- DOCUMENTS
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Members can view docs in their orgs
CREATE POLICY "documents_select_member" ON documents
  FOR SELECT USING (is_org_member(org_id));

-- Members can upload docs (admin+ in production, but member for MVP)
CREATE POLICY "documents_insert_member" ON documents
  FOR INSERT WITH CHECK (is_org_member(org_id));

-- Admins can update docs
CREATE POLICY "documents_update_admin" ON documents
  FOR UPDATE USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- Admins can delete docs
CREATE POLICY "documents_delete_admin" ON documents
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================
-- DOCUMENT CHUNKS
-- ============================================
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Members can view chunks in their org
CREATE POLICY "chunks_select_member" ON document_chunks
  FOR SELECT USING (is_org_member(org_id));

-- System inserts chunks (service role bypasses RLS)
-- Members need insert for direct operations
CREATE POLICY "chunks_insert_member" ON document_chunks
  FOR INSERT WITH CHECK (is_org_member(org_id));

-- Admins can delete chunks
CREATE POLICY "chunks_delete_admin" ON document_chunks
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================
-- CHAT SESSIONS
-- ============================================
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Members can view chat sessions in their org
CREATE POLICY "sessions_select_member" ON chat_sessions
  FOR SELECT USING (is_org_member(org_id));

-- Members can create chat sessions
CREATE POLICY "sessions_insert_member" ON chat_sessions
  FOR INSERT WITH CHECK (is_org_member(org_id));

-- Users can delete their own sessions
CREATE POLICY "sessions_delete_own" ON chat_sessions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- CHAT MESSAGES
-- ============================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Members can view messages in sessions they can access
CREATE POLICY "messages_select" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND is_org_member(chat_sessions.org_id)
    )
  );

-- Members can insert messages into sessions they can access
CREATE POLICY "messages_insert" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND is_org_member(chat_sessions.org_id)
    )
  );

-- Users can update their own message feedback
CREATE POLICY "messages_update_feedback" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- WIDGET TOKENS
-- ============================================
ALTER TABLE widget_tokens ENABLE ROW LEVEL SECURITY;

-- Members can view widget tokens in their org
CREATE POLICY "widgets_select_member" ON widget_tokens
  FOR SELECT USING (is_org_member(org_id));

-- Admins can create widget tokens
CREATE POLICY "widgets_insert_admin" ON widget_tokens
  FOR INSERT WITH CHECK (is_org_admin(org_id));

-- Admins can update widget tokens
CREATE POLICY "widgets_update_admin" ON widget_tokens
  FOR UPDATE USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- Admins can delete widget tokens
CREATE POLICY "widgets_delete_admin" ON widget_tokens
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================
-- PERFORMANCE INDEXES for RLS
-- ============================================
-- These indexes make the membership lookups in RLS policies fast.
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON memberships(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_role ON memberships(org_id, role);
```

- [ ] **Step 2: Execute RLS policies in Supabase**

1. Open Supabase Dashboard → SQL Editor
2. Paste the entire contents of `lib/db/migrations/rls-policies.sql`
3. Click "Run"

Expected: All policies created successfully. No errors.

- [ ] **Step 3: Verify RLS is working**

In Supabase SQL Editor, run:

```sql
-- This should show RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'organizations', 'memberships', 'invites',
                   'documents', 'document_chunks', 'chat_sessions',
                   'chat_messages', 'widget_tokens');
```

Expected: `rowsecurity = true` for all 9 tables.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: RLS policies for all tables - multi-tenant isolation"
```

---

## Task 7: Org Management API Routes

**Files:**
- Create: `app/api/organizations/route.ts`
- Create: `app/api/organizations/switch/route.ts`
- Create: `app/api/invites/route.ts`
- Create: `app/api/invites/accept/route.ts`

- [ ] **Step 1: Create org CRUD route**

Create `app/api/organizations/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { createOrganization } from '@/lib/auth/org-utils';
import { db } from '@/lib/db/client';
import { organizations, memberships } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// GET /api/organizations — list user's orgs
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, user.id),
    with: { organization: true },
  });

  const orgs = userMemberships.map((m) => ({
    ...m.organization,
    role: m.role,
  }));

  return NextResponse.json({ organizations: orgs });
}

// POST /api/organizations — create new org
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const org = await createOrganization(user.id, name.trim());

  return NextResponse.json({ organization: org }, { status: 201 });
}
```

- [ ] **Step 2: Create org switch route**

Create `app/api/organizations/switch/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { switchOrg } from '@/lib/auth/org-utils';
import { NextResponse } from 'next/server';

// POST /api/organizations/switch — switch active org
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { orgId } = body;

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const success = await switchOrg(user.id, orgId);

  if (!success) {
    return NextResponse.json(
      { error: 'Not a member of this organization' },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create invite routes**

Create `app/api/invites/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { getCurrentOrgId, getUserRole, isAdmin } from '@/lib/auth/org-utils';
import { db } from '@/lib/db/client';
import { invites, memberships } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// GET /api/invites — list pending invites for current org
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getCurrentOrgId(user.id);
  if (!orgId) return NextResponse.json({ error: 'No org selected' }, { status: 400 });

  const pendingInvites = await db.query.invites.findMany({
    where: and(eq(invites.orgId, orgId), isNull(invites.acceptedAt)),
  });

  return NextResponse.json({ invites: pendingInvites });
}

// POST /api/invites — send a new invite
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getCurrentOrgId(user.id);
  if (!orgId) return NextResponse.json({ error: 'No org selected' }, { status: 400 });

  // Only admins/owners can invite
  const role = await getUserRole(user.id, orgId);
  if (!isAdmin(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { email, role: inviteRole = 'member' } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check if already a member
  const existingMembership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.orgId, orgId),
      // Note: we can't check by email here directly — we'd need to look up
      // the user by email in Supabase auth. For MVP, we check on accept.
    ),
  });

  // Check for existing pending invite
  const existingInvite = await db.query.invites.findFirst({
    where: and(
      eq(invites.orgId, orgId),
      eq(invites.email, email.toLowerCase()),
      isNull(invites.acceptedAt),
    ),
  });

  if (existingInvite) {
    return NextResponse.json({ error: 'Invite already pending for this email' }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const [invite] = await db
    .insert(invites)
    .values({
      orgId,
      email: email.toLowerCase(),
      role: inviteRole,
      invitedBy: user.id,
      expiresAt,
    })
    .returning();

  // TODO: Send invite email via Resend (Phase 6)

  return NextResponse.json({ invite }, { status: 201 });
}
```

Create `app/api/invites/accept/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { invites, memberships } from '@/lib/db/schema';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// POST /api/invites/accept — accept an invite
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { inviteId } = body;

  if (!inviteId) {
    return NextResponse.json({ error: 'inviteId is required' }, { status: 400 });
  }

  // Find valid invite matching user's email
  const invite = await db.query.invites.findFirst({
    where: and(
      eq(invites.id, inviteId),
      eq(invites.email, user.email!.toLowerCase()),
      isNull(invites.acceptedAt),
      gt(invites.expiresAt, new Date()),
    ),
  });

  if (!invite) {
    return NextResponse.json(
      { error: 'Invite not found, expired, or not for your email' },
      { status: 404 }
    );
  }

  // Check if already a member
  const existingMembership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.orgId, invite.orgId),
      eq(memberships.userId, user.id),
    ),
  });

  if (existingMembership) {
    return NextResponse.json({ error: 'Already a member of this org' }, { status: 409 });
  }

  // Create membership
  await db.insert(memberships).values({
    orgId: invite.orgId,
    userId: user.id,
    role: invite.role,
  });

  // Mark invite as accepted
  await db
    .update(invites)
    .set({ acceptedAt: new Date() })
    .where(eq(invites.id, invite.id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: org management API routes - CRUD, switch, invites"
```

---

## Task 8: Dashboard Layout

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/OrgSwitcher.tsx`
- Create: `components/layout/PlanBadge.tsx`

- [ ] **Step 1: Create PlanBadge component**

Create `components/layout/PlanBadge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';

const planColors: Record<string, string> = {
  starter: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/20 text-primary',
  team: 'bg-violet-500/20 text-violet-400',
  enterprise: 'bg-amber-500/20 text-amber-400',
};

export function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${planColors[plan] ?? planColors.starter}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}
```

- [ ] **Step 2: Create OrgSwitcher component**

Create `components/layout/OrgSwitcher.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { PlanBadge } from './PlanBadge';
import type { Organization } from '@/lib/db/schema';

interface OrgWithRole extends Organization {
  role: string;
}

interface OrgSwitcherProps {
  currentOrg: OrgWithRole;
  orgs: OrgWithRole[];
}

export function OrgSwitcher({ currentOrg, orgs }: OrgSwitcherProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg.id) return;
    setLoading(true);

    await fetch('/api/organizations/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });

    router.refresh();
    setLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto"
          disabled={loading}
        >
          <div className="flex items-center gap-2 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary font-semibold text-sm">
              {currentOrg.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[140px]">
                {currentOrg.name}
              </span>
              <PlanBadge plan={currentOrg.plan} />
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className={org.id === currentOrg.id ? 'bg-accent' : ''}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary text-xs font-semibold">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{org.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          + Create new workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Create Sidebar component**

Create `components/layout/Sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrgSwitcher } from './OrgSwitcher';
import type { Organization } from '@/lib/db/schema';

interface OrgWithRole extends Organization {
  role: string;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/documents', label: 'Documents', icon: '📄' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/widget', label: 'Widget', icon: '🔌' },
  { href: '/team', label: 'Team', icon: '👥' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
  { href: '/billing', label: 'Billing', icon: '💳' },
];

interface SidebarProps {
  currentOrg: OrgWithRole;
  orgs: OrgWithRole[];
}

export function Sidebar({ currentOrg, orgs }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-xl font-bold text-primary">LexiLift</h1>
      </div>

      {/* Org Switcher */}
      <div className="border-b border-border p-3">
        <OrgSwitcher currentOrg={currentOrg} orgs={orgs} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Create dashboard layout**

Create `app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';
import { ensureProfileAndOrg, getCurrentOrgId } from '@/lib/auth/org-utils';
import { db } from '@/lib/db/client';
import { memberships } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure profile + default org
  await ensureProfileAndOrg(user.id, user.user_metadata?.full_name);

  // Get user's orgs
  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.userId, user.id),
    with: { organization: true },
  });

  const orgs = userMemberships.map((m) => ({
    ...m.organization,
    role: m.role,
  }));

  const currentOrgId = await getCurrentOrgId(user.id);
  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? orgs[0];

  if (!currentOrg) {
    // Edge case: no orgs — should not happen but handle gracefully
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentOrg={currentOrg} orgs={orgs} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Create dashboard overview page**

Create `app/(dashboard)/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to LexiLift. Get started by uploading your first document.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Documents</p>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Queries this month</p>
          <p className="text-3xl font-bold">0 / 500</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Team members</p>
          <p className="text-3xl font-bold">1</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify dashboard renders**

```bash
npm run dev
```

1. Login at http://localhost:3000/login
2. Should redirect to dashboard with sidebar, org switcher, plan badge
3. Verify dark theme with violet accent is applied

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: dashboard layout - sidebar, org switcher, plan badge, overview page"
```

---

## Task 9: Adapter Pattern Scaffolding

**Files:**
- Create: `lib/adapters/vector-store/interface.ts`
- Create: `lib/adapters/vector-store/pinecone.ts`
- Create: `lib/adapters/llm/interface.ts`
- Create: `lib/adapters/reranker/interface.ts`
- Create: `lib/adapters/reranker/voyage.ts`
- Create: `lib/adapters/billing/interface.ts`
- Create: `lib/adapters/storage/interface.ts`
- Test: `lib/adapters/__tests__/interfaces.test.ts`

- [ ] **Step 1: Write test for adapter interfaces**

Create `lib/adapters/__tests__/interfaces.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Adapter Interfaces', () => {
  it('exports VectorStoreAdapter interface', async () => {
    const mod = await import('../vector-store/interface');
    // TypeScript interfaces don't exist at runtime, but we export a type guard
    expect(mod).toBeDefined();
  });

  it('exports LLMAdapter interface', async () => {
    const mod = await import('../llm/interface');
    expect(mod).toBeDefined();
  });

  it('exports RerankerAdapter interface', async () => {
    const mod = await import('../reranker/interface');
    expect(mod).toBeDefined();
  });

  it('exports BillingAdapter interface', async () => {
    const mod = await import('../billing/interface');
    expect(mod).toBeDefined();
  });

  it('exports StorageAdapter interface', async () => {
    const mod = await import('../storage/interface');
    expect(mod).toBeDefined();
  });
});
```

- [ ] **Step 2: Create adapter interfaces**

Create `lib/adapters/vector-store/interface.ts`:

```typescript
export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface VectorChunk {
  id: string;
  values: number[]; // dense embedding
  sparseValues?: { indices: number[]; values: number[] };
  metadata?: Record<string, unknown>;
}

export interface VectorStoreAdapter {
  upsert(chunks: VectorChunk[], namespace: string): Promise<void>;
  query(
    embedding: number[],
    namespace: string,
    topK: number,
    sparseVector?: { indices: number[]; values: number[] }
  ): Promise<VectorMatch[]>;
  delete(ids: string[], namespace: string): Promise<void>;
  deleteNamespace(namespace: string): Promise<void>;
}
```

Create `lib/adapters/llm/interface.ts`:

```typescript
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMAdapter {
  chat(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<AsyncIterable<string>>;
  getAvailableModels(): string[];
}
```

Create `lib/adapters/reranker/interface.ts`:

```typescript
export interface RerankResult {
  index: number;
  score: number;
}

export interface RerankerAdapter {
  rerank(
    query: string,
    documents: string[],
    topK?: number
  ): Promise<RerankResult[]>;
}
```

Create `lib/adapters/billing/interface.ts`:

```typescript
export interface BillingAdapter {
  createCheckoutUrl(planId: string, orgId: string): Promise<string>;
  getSubscription(orgId: string): Promise<{
    status: string;
    planId: string;
    currentPeriodEnd: Date;
  } | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
```

Create `lib/adapters/storage/interface.ts`:

```typescript
export interface StorageAdapter {
  upload(
    path: string,
    file: File | Buffer,
    contentType: string
  ): Promise<{ url: string }>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}
```

- [ ] **Step 3: Create placeholder Pinecone adapter**

Create `lib/adapters/vector-store/pinecone.ts`:

```typescript
import type { VectorStoreAdapter, VectorChunk, VectorMatch } from './interface';

export class PineconeAdapter implements VectorStoreAdapter {
  async upsert(chunks: VectorChunk[], namespace: string): Promise<void> {
    throw new Error('PineconeAdapter.upsert not implemented — Phase 2');
  }

  async query(
    embedding: number[],
    namespace: string,
    topK: number
  ): Promise<VectorMatch[]> {
    throw new Error('PineconeAdapter.query not implemented — Phase 2');
  }

  async delete(ids: string[], namespace: string): Promise<void> {
    throw new Error('PineconeAdapter.delete not implemented — Phase 2');
  }

  async deleteNamespace(namespace: string): Promise<void> {
    throw new Error('PineconeAdapter.deleteNamespace not implemented — Phase 2');
  }
}
```

Create `lib/adapters/reranker/voyage.ts`:

```typescript
import type { RerankerAdapter, RerankResult } from './interface';

export class VoyageRerankerAdapter implements RerankerAdapter {
  async rerank(
    query: string,
    documents: string[],
    topK: number = 5
  ): Promise<RerankResult[]> {
    throw new Error('VoyageRerankerAdapter.rerank not implemented — Phase 3');
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run -- lib/adapters/__tests__/interfaces.test.ts
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adapter pattern scaffolding - vector store, LLM, reranker, billing, storage interfaces"
```

---

## Task 10: Deploy to Vercel + Final Verification

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Framework: Next.js (auto-detected)
4. Add environment variables from `.env.local`
5. Deploy

Expected: Successful deployment. Preview URL shows the login page.

- [ ] **Step 3: Verify end-to-end flow**

1. Open the Vercel preview URL
2. Go to `/signup` → create account
3. Confirm email → redirected to dashboard
4. Verify: sidebar shows, org switcher works, plan badge shows "Starter"
5. Go to `/login` → login with same account → redirected to dashboard

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: phase 1 complete - foundation deployed to Vercel"
```

---

## Summary

| Task | Sessions | What's Built |
|---|---|---|
| 1. Project Setup | ~2 | Next.js + Tailwind + shadcn/ui + dark theme + Vitest |
| 2. Database + Schema | ~2 | Drizzle ORM, all 9 tables, relations, types |
| 3. Auth Client | ~2 | Supabase browser/server/middleware clients |
| 4. Auth Pages | ~2 | Login, signup, callback, protected routes |
| 5. Profile + Org Auto-Create | ~2 | Auto-create profile + default org on signup |
| 6. RLS Policies | ~3 | Row-level security on all tables, helper functions |
| 7. Org Management APIs | ~3 | CRUD orgs, switch, invite, accept |
| 8. Dashboard Layout | ~3 | Sidebar, org switcher, plan badge, overview |
| 9. Adapter Scaffolding | ~1 | All 5 adapter interfaces + placeholder implementations |
| 10. Deploy + Verify | ~1 | Vercel deployment, end-to-end verification |
| **Total** | **~21** | **Full Phase 1 foundation** |
