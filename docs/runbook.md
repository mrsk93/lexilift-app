# LexiLift Runbook

Operational reference for responding to incidents, performing common
maintenance, and restoring service. If something here is wrong or missing,
treat it as a bug and fix the doc in the same PR as the fix.

## Health checks

| Endpoint        | Purpose                              | Expected response             |
|-----------------|--------------------------------------|-------------------------------|
| `GET /api/health` | Liveness — process is up           | `200 {"status":"ok"}` (always, no deps) |
| `GET /api/ready`  | Readiness — DB is reachable        | `200` if DB query succeeds, `503` otherwise |

The Vercel health-check and any external uptime monitor should hit
`/api/health` for liveness and `/api/ready` for "ready to serve traffic."
A 503 from `/api/ready` should page the on-call (see below).

## Monitoring

| Surface   | Where to look                                          |
|-----------|--------------------------------------------------------|
| Errors    | Sentry → `lexilift-web` project, org `lexilift`        |
| Logs      | Vercel → Project → Logs. Structured pino JSON, every log line carries `x-request-id`. |
| Analytics | PostHog → `lexilift` project                           |
| Uptime    | Vercel automatic HTTP checks; status page at `https://lexilift.statuspage.io` (TBD) |
| Background jobs | Inngest cloud dashboard → `lexilift` app, or local `npm run dev:inngest` UI on `:8288` |

### Log correlation

Every request gets a request ID set in `src/proxy.ts`. It is propagated as the
`x-request-id` response header **and** as a child-logger binding inside
`src/lib/log/log.ts`. To trace a single user action:

1. Grab the `x-request-id` from a Sentry breadcrumb or from a user's browser
   dev tools.
2. In Vercel logs, search for that ID. Every log line for the request —
   proxy, route handler, DB query, LLM call — will share it.

## Common incidents

### Readiness probe failing (`/api/ready` returns 503)

1. Open Supabase status page (`status.supabase.com`). If Supabase is
   degraded, wait for them; post a customer-facing note.
2. Vercel → Logs, filter by the readiness route. Look for `connection
   refused` or `too many clients`.
3. If Supabase is healthy but the probe is failing:
   - Check `DATABASE_URL` is the **transaction pooler** URL (port `6543`),
     not the direct connection (port `5432`). Serverless functions exhaust
     direct connections.
   - If the connection-pooler is hitting its limit, file a Supabase support
     ticket to raise it; meanwhile, reduce concurrent traffic by throttling
     the widget at the edge.
4. For data loss, jump to "Database restore" below.
5. Post incident update on Twitter + the status page.

### Sentry error spike

1. Open Sentry → Issues. Sort by **events in the last hour**.
2. Identify the top error. Click in.
3. Check the **Users** tab — is it one customer (`org.id` /
   `user.id` tag) or many?
4. Click the **Suspect Commit** release chip. If it points to the most
   recent deploy, that's almost certainly the cause.
5. If a recent deploy is responsible:
   - Vercel → Deployments → find the previous green deployment.
   - Click **⋯** → **Promote to Production**.
   - Watch error rate for 10 minutes.
6. Open a post-mortem doc within 48h. Link it in `#incidents`.

### Rate-limit alerts (Upstash)

1. Upstash console → `endless-seagull-139526` (or current instance) →
   **Data Browser** → `rl:*` keys. Sort by TTL — long-lived keys are
   sustained limit hits, not bursts.
2. If the scope is `query`: legitimate traffic growth, or a single org
   exceeding their plan? Cross-check the org's `queryCount` in
   Postgres.
3. If legitimate: bump the limit in `src/lib/ratelimit/scopes.ts` and ship
   the change. Add an alert threshold that fires **before** customers feel
   it.
4. If abusive: enable a Vercel WAF rule (rate-limit by IP or ASN), or
   contact the offending org.
5. If the alerts are from a single widget token, revoke it via the team
   page.

### Pinecone dimension mismatch

Symptoms: uploads succeed but every query returns the chunked text
verbatim with no useful answer, or `PineconeBadRequest` errors citing
`vector dimension 1024 does not match index dimension 1536`.

1. Confirm the mismatch:
   ```bash
   node scripts/recreate-pinecone-index.mjs
   ```
   The script logs `Target dimension=…` and `Current dimension=…`.
2. Verify `EMBEDDING_DIMENSION` in `.env.local` matches what
   `src/lib/llm/embeddings.ts` produces (1536 for `text-embedding-3-small`).
3. If they disagree, fix `.env.local` first. If they agree but Pinecone
   disagrees, the index was created with the wrong dim — proceed.
4. Back up the index (see "Pinecone backup" below), then re-run the
   recreate script. It will create a new index with the correct dim.
5. Switch `PINECONE_INDEX` to the new name and redeploy.
6. Re-embed all existing documents by re-uploading them, or run a
   one-shot `reembed` job (TBD).

### Inngest function failure

1. Inngest cloud → `lexilift` → Functions → pick the failing function →
   **Runs**. The failed run is at the top.
2. Click the run. Each step shows input, output, and stack trace.
3. Common causes:
   - `processDocument` — Pinecone 4xx/5xx, parser OOM on a huge PDF.
   - `hardDeleteAccounts` — Supabase admin client RLS rejection (we
     intentionally bypass RLS, so this means the env var is missing).
4. Click **Replay** to re-run with the same event payload after the
   upstream is healthy. Inngest's retry policy will also kick in for
   transient errors.
5. For persistent failures, the function ends up in the dead-letter
   state. Inspect, fix the code, and replay — the function gets a new
   run id.

### "I don't have enough information to answer" from chat

Root causes, in order of likelihood:

1. **Pinecone dimension mismatch** — the embedding model produced 1024-dim
   vectors but the index is 1536-dim, so the similarity search returns
   noise. See above.
2. **Dead Pinecone key** — the API key in Vercel env was rotated without
   updating the value. Sentry will show 401s from the Pinecone client.
   Rotate per [`secrets.md`](secrets.md).
3. **Empty Pinecone namespace** — the org's documents were never embedded
   (e.g. `processDocument` failed silently). Check Inngest runs for that
   `docId` and replay.
4. **RAG top-k threshold too high** — the rerank score drops below the
   confidence cutoff. Lower the threshold in
   `src/lib/llm/rag-confidence.ts` (TBD) and re-test with a known
   answerable question.
5. **Org filter mismatch** — the question is being routed with a wrong
   `org_id`. Cross-check the chat session's `orgId` in Postgres.

## Backups

### Database (Supabase Postgres)

- **Point-in-Time Recovery (PITR)** is enabled. Retention: **7 days** on the
  Pro plan.
- A **daily logical backup** runs at **02:00 UTC**, managed by Supabase.
- To restore to a specific timestamp:
  1. Supabase dashboard → Project → **Database** → **Backups**.
  2. Click **Restore to point in time**.
  3. Pick the timestamp; review the rows that will be touched.
  4. Confirm. The restore runs against a transient copy first; promote
     when satisfied.
- **DR drill:** quarterly. Restore a staging project from a production
  backup and run the test suite + a few `curl` checks against the
  restored API. File the result under `docs/drills/YYYY-MM-DD.md`.

### Vectors (Pinecone)

- Pinecone **serverless** indexes have multi-AZ replication built in.
- **Backups:** weekly, via the Pinecone CLI or the dashboard
  → Index → **Backups**.
  ```bash
  pc index backup -i lexilift -n lexilift-backup-$(date +%F)
  ```
- **Restore:** create a new index from the backup, then point
  `PINECONE_INDEX` at it. Vercel redeploy picks it up automatically.
- Document the restore in `docs/drills/`.

### Object storage (Supabase Storage)

- Buckets are RLS-protected; access is gated by `memberships`.
- **No separate backup** is configured. Files are tied to org records;
  if a customer's data is restored from a Postgres backup, the
  associated storage objects are restored in lockstep by the
  parallel Supabase Storage backup that runs at the same time as the
  Postgres logical backup.
- Verify this lockstep quarterly in the same DR drill.

### Customer data region migration

When moving a customer from US to EU (or vice versa):

1. Export their data via `GET /api/account/export`.
2. Create a new org in the target region.
3. Re-upload each document (vectors are not cross-region).
4. Re-create chat sessions and invites — they do not migrate.
5. Soft-delete the source org and let `hardDeleteAccounts` clean up
   after 30 days.

## On-call

- **Primary:** rotating weekly. PagerDuty schedule `lexilift-primary`.
- **Secondary:** rotating weekly. PagerDuty schedule `lexilift-secondary`.
- **Escalation:** if primary does not acknowledge in **10 minutes**,
  secondary is paged automatically.
- **Response targets:**

  | Severity | Acknowledgement | Resolution target |
  |----------|-----------------|-------------------|
  | P1 (full outage, data loss, security) | 5 min | 1 h |
  | P2 (degraded core feature) | 15 min | 4 h |
  | P3 (minor bug, cosmetic) | 1 business day | next sprint |

- **Out of hours:** P1 pages wake the on-call. P2 waits until morning
  unless a customer is blocked. P3 always waits.
- **Comms:** every P1/P2 gets a customer-facing update within 30 min
  of acknowledgement, and a follow-up every 60 min until resolved.
- **Post-mortem:** required for every P1, every Sentry error spike that
  triggered customer-visible impact, and any incident that required a
  rollback. Filed within 48 h, reviewed in the next team sync.
