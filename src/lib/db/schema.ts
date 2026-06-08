import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  bigint,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- AUTH & MULTI-TENANCY ---

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').default('starter'), // starter | pro | team | enterprise
  polarCustomerId: text('polar_customer_id'),
  polarSubscriptionId: text('polar_subscription_id'),
  queryCount: integer('query_count').default(0),
  queryLimit: integer('query_limit').default(500),
  queryResetAt: timestamp('query_reset_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(), // Supabase auth.users.id
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  llmModel: text('llm_model').default('gpt-4o'),
  documentsCount: integer('documents_count').default(0),
  dataRegion: text('data_region').default('us'),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
});

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(), // Supabase auth.users.id
    role: text('role').default('member'), // owner | admin | member
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('memberships_org_id_user_id_key').on(table.orgId, table.userId),
  ]
);

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').default('member'),
  invitedBy: uuid('invited_by').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).default(
    sql`(now() + interval '7 days')`
  ),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // = auth.users.id
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  currentOrgId: uuid('current_org_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- DOCUMENTS & RAG ---

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fileUrl: text('file_url'),
  fileType: text('file_type').notNull(), // pdf | docx | txt | md | url
  sourceUrl: text('source_url'),
  status: text('status').default('processing'), // processing | ready | failed
  errorMessage: text('error_message'),
  sha256: text('sha256'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  chunkCount: integer('chunk_count').default(0),
  fileSize: bigint('file_size', { mode: 'number' }),
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  docId: uuid('doc_id')
    .references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // { page_num, heading, char_start, char_end }
  pineconeId: text('pinecone_id'), // ID in Pinecone for cross-reference
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- CHAT ---

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id'), // null for anonymous widget users
  source: text('source').default('dashboard'), // dashboard | widget
  title: text('title'),
  llmModel: text('llm_model').default('gpt-4o'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // user | assistant
  content: text('content').notNull(),
  citations: jsonb('citations'), // [{ chunk_id, doc_name, page_num, excerpt }]
  feedback: text('feedback'), // thumbs_up | thumbs_down | null
  tokensUsed: integer('tokens_used'),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- WIDGET ---

export const widgetTokens = pgTable('widget_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => organizations.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  name: text('name').default('Default Widget'),
  allowedOrigins: text('allowed_origins').array(),
  isActive: boolean('is_active').default(true),
  primaryColor: text('primary_color').default('#006c49'), // Use DESIGN.md Emerald Green
  welcomeMessage: text('welcome_message').default('Hi! Ask me anything about our docs.'),
  logoUrl: text('logo_url'),
  rateLimitPerMin: integer('rate_limit_per_min').default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- BILLING ---

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull(),
  invoiceStatus: text('status').notNull(),
  hostedUrl: text('hosted_url'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
