/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'

const runIf = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip

runIf('chat flow (real DB, RUN_INTEGRATION=1)', () => {
  let db: typeof import('@/lib/db/client').db
  let schema: typeof import('@/lib/db/schema')
  let eq: typeof import('drizzle-orm').eq

  const userId = randomUUID()
  let orgId: string
  let docId: string
  let sessionId: string | undefined

  beforeAll(async () => {
    db = (await import('@/lib/db/client')).db
    schema = await import('@/lib/db/schema')
    eq = (await import('drizzle-orm')).eq

    await db.insert(schema.profiles).values({
      id: userId,
      fullName: 'E2E Test User',
    })

    const [org] = await db
      .insert(schema.organizations)
      .values({
        name: 'E2E Org',
        slug: `e2e-${Date.now()}-${userId.slice(0, 8)}`,
        createdBy: userId,
      })
      .returning()
    orgId = org.id

    await db.insert(schema.memberships).values({ orgId, userId, role: 'owner' })

    const [doc] = await db
      .insert(schema.documents)
      .values({
        orgId,
        name: 'E2E doc',
        fileType: 'txt',
        status: 'ready',
        uploadedBy: userId,
      })
      .returning()
    docId = doc.id
  })

  afterAll(async () => {
    if (!db) return
    if (sessionId) {
      await db.delete(schema.chatMessages).where(eq(schema.chatMessages.sessionId, sessionId))
      await db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, sessionId))
    }
    if (docId) await db.delete(schema.documents).where(eq(schema.documents.id, docId))
    if (orgId) await db.delete(schema.memberships).where(eq(schema.memberships.orgId, orgId))
    if (orgId) await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId))
    await db.delete(schema.profiles).where(eq(schema.profiles.id, userId))
  })

  it('creates a session, inserts user + assistant messages, accepts feedback, and reads them back', async () => {
    const [session] = await db
      .insert(schema.chatSessions)
      .values({ orgId, userId, title: 'New chat' })
      .returning()
    sessionId = session.id

    await db
      .insert(schema.chatMessages)
      .values({ sessionId, role: 'user', content: 'hi' })
      .returning()

    const [assistant] = await db
      .insert(schema.chatMessages)
      .values({
        sessionId,
        role: 'assistant',
        content: 'hello',
        citations: [],
      })
      .returning()

    await db
      .update(schema.chatMessages)
      .set({ feedback: 'thumbs_up' })
      .where(eq(schema.chatMessages.id, assistant.id))

    const rows = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId))

    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.role).sort()).toEqual(['assistant', 'user'])
    expect(rows.find((r) => r.id === assistant.id)?.feedback).toBe('thumbs_up')
    expect(rows.find((r) => r.id === assistant.id)?.citations).toEqual([])
  })
})
