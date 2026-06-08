# Secrets & Rotation Policy

This document is the source of truth for **what counts as a secret**,
**who owns it**, **how often it rotates**, and **how to rotate it
safely.** When in doubt, treat a value as a secret.

## Secret inventory

The table below lists every secret the application reads at runtime. Names
match the env-var keys (case-sensitive). The `NEXT_PUBLIC_` prefix marks
values that are intentionally bundled into the browser — they are still
rotated on schedule, even though they are not strictly confidential.

| Secret                          | Provider         | Rotation   | Owner     |
|---------------------------------|------------------|------------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase         | 90 days    | Platform  |
| `SUPABASE_ANON_KEY` *(env: `NEXT_PUBLIC_SUPABASE_ANON_KEY`)* | Supabase | 365 days | Platform  |
| `POLAR_ACCESS_TOKEN`            | Polar.sh         | 90 days    | Billing   |
| `POLAR_WEBHOOK_SECRET`          | Polar.sh         | 365 days   | Billing   |
| `RESEND_API_KEY`                | Resend           | 90 days    | Platform  |
| `OPENAI_API_KEY`                | OpenAI           | 90 days    | Platform  |
| `ANTHROPIC_API_KEY`             | Anthropic        | 90 days    | Platform  |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Google AI Studio | 90 days    | Platform  |
| `VOYAGE_API_KEY`                | Voyage AI        | 90 days    | Platform  |
| `PINECONE_API_KEY`              | Pinecone         | 90 days    | Platform  |
| `UPSTASH_REDIS_REST_TOKEN`      | Upstash          | 180 days   | Platform  |
| `POSTHOG_PROJECT_API_KEY`       | PostHog          | 365 days   | Analytics |
| `SENTRY_AUTH_TOKEN`             | Sentry           | 365 days   | Platform  |
| `SENTRY_DSN`                    | Sentry           | never (read-only ingest) | Platform  |
| `INNGEST_EVENT_KEY`             | Inngest          | 90 days    | Platform  |
| `INNGEST_SIGNING_KEY`           | Inngest          | 90 days    | Platform  |

### Non-secrets worth flagging

These look like secrets but are configuration, not credentials, so they
are **not** in the table above:

- `DATABASE_URL` — connection string. Contains a password, so it is
  treated as a secret for storage and access purposes, but the
  rotation cadence matches the database (rotate by changing the DB
  password, then updating the env var).
- `NEXT_PUBLIC_SUPABASE_URL`, `APP_URL`, `EMAIL_FROM` — public
  configuration.
- `EMBEDDING_DIMENSION`, `PINECONE_INDEX`, `SENTRY_ORG`,
  `SENTRY_PROJECT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_REPLAYS_*`,
  `SENTRY_ENV` — non-secret configuration.
- `POLAR_ORG_ID`, `POLAR_PRO_PRODUCT_ID`, `POLAR_TEAM_PRODUCT_ID` —
  non-secret Polar product mapping.

## Rotation procedure

Follow this procedure for **every** rotation. It is designed to allow a
seamless cutover with a brief overlap window where both old and new
values are valid.

1. **Generate** the new secret in the provider's dashboard or CLI.
   - For Polar webhook secrets, copy the new value into a scratch doc
     so you can update the webhook target with the new signing
     material in step 3.
2. **Add the new value to Vercel** for **production** first, then
   **preview**, then any other environments. Keep the old value
   alongside it during the overlap window (Vercel stores multiple
   values per key — append, do not overwrite).
3. **If the secret participates in a webhook** (Polar, Inngest), update
   the **provider side** to start signing with the new value. Verify
   the signing key in their dashboard.
4. **Verify** the new value works:
   - Trigger a real or synthetic request that exercises the credential
     (e.g. POST to `/api/webhooks/polar` with a test event, or call
     `/api/ready` to confirm Supabase).
   - Check Sentry and the Vercel logs for the previous
     `unauthorized` / `401` errors to stop appearing.
5. **Remove the old value** from Vercel once the new value has been
   healthy for **at least 24 hours** (or **1 hour** for low-risk
   providers, **72 hours** for `SUPABASE_SERVICE_ROLE_KEY`).
6. **Record** the rotation in `docs/secrets-rotation-log.md` with
   date, secret name, operator, and the next scheduled rotation date.

### Provider-specific notes

- **Supabase** — `service_role` and `anon` keys can be rotated from
  Project → Settings → API → **Roll new keys**. Do **not** click
  **Reset** on the JWT secret; that invalidates every issued session
  immediately.
- **Polar.sh** — webhook secrets rotate independently of the access
  token. The webhook handler validates the HMAC header
  `webhook-signature` against `POLAR_WEBHOOK_SECRET`.
- **OpenAI / Anthropic / Google** — generate a new key, leave the old
  one active for 24 hours, then revoke.
- **Pinecone** — keys are project-scoped. Rotate by issuing a new key
  in the Pinecone console; old keys are accepted alongside for 24
  hours, then revoke.
- **Inngest signing key** — rotating the **signing** key invalidates
  the local dev server handshake. After rotating in the Inngest
  dashboard, also update `INNGEST_SIGNING_KEY` in
  `inngest-cli@latest dev` config so local replays continue to
  verify.

## Storage rules

- **Never** commit a secret to git. CI runs [`gitleaks`](https://github.com/gitleaks/gitleaks)
  on every push; leaks are a P1.
  - If a leak is discovered, rotate **immediately** (no overlap
    window) and add a `gitleaks` rule to catch the pattern
    retroactively.
- **Local development:** copy values from 1Password → `.env.local`.
  `.env.local` is `.gitignore`d. `.env.example` carries placeholder
  values only.
- **CI** (GitHub Actions): secrets are stored in **GitHub Actions
  Secrets** and exposed as `secrets.*` to workflows. Source-map
  uploads to Sentry use `SENTRY_AUTH_TOKEN`; do not reuse it
  elsewhere.
- **Preview environments (Vercel):** inherit from the `preview`
  environment scope. Each PR gets its own preview URL with its own
  copy of the env. Do not reuse production secrets in preview
  contexts.
- **Production:** Vercel env vars, `production` scope. Only the
  platform owner has write access. Vercel audit log is reviewed
  weekly.
- **Customer support access:** never paste a secret into Slack, email,
  or a ticket. If a value is needed for debugging, regenerate it
  after the support session.
