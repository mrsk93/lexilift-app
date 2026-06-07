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
  PINECONE_ENVIRONMENT: z.string().min(1).optional(),
  VOYAGE_API_KEY: z.string().min(1).optional(),
  POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
  POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
  POLAR_ORG_ID: z.string().min(1).optional(),
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
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
})

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_POSTHOG_KEY: true,
  NEXT_PUBLIC_POSTHOG_HOST: true,
  NEXT_PUBLIC_APP_URL: true,
})

function parseServer() {
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => {
        const path = i.path.join('.') || '(root)'
        const suffix = i.input === undefined ? ' (missing)' : ''
        return `  - ${path}${suffix}`
      })
      .join('\n')
    throw new Error(
      `Invalid environment variables:\n${missing}\n\nSee docs/superpowers/specs/2026-06-06-lexilift-mvp-gap-fill-design.md §6.4 for the full list.`,
    )
  }
  return parsed.data
}

export const env: z.infer<typeof serverSchema> =
  typeof window === 'undefined'
    ? parseServer()
    : (clientSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      }) as z.infer<typeof serverSchema>)
