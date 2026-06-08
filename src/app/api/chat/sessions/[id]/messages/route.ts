import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions } from '@/lib/db/schema'

/**
 * GET /api/chat/sessions/[id]/messages
 *
 * Returns the persisted messages of a session as AI SDK v6 UIMessages:
 *   { id, role, parts: [{ type: 'text', text }], metadata?: { citations? } }
 *
 * Auth: the session must belong to the current user/org. Citations are
 * carried in `metadata.citations` so the client MessageBubble can render
 * the source cards without an extra round-trip.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: sessionId } = await params

    // Verify session ownership (this also gives us the orgId for org-scoped checks)
    const [session] = await db
      .select({ id: chatSessions.id, userId: chatSessions.userId, orgId: chatSessions.orgId })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!session.orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await requireOrgAccess(session.orgId)

    const rows = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        citations: chatMessages.citations,
        feedback: chatMessages.feedback,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))

    // Map to AI SDK v6 UIMessage shape
    const messages = rows.map((m) => ({
      id: m.id,
      role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'assistant') as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: m.content }],
      metadata: {
        citations: Array.isArray(m.citations) ? m.citations : undefined,
        feedback: m.feedback ?? undefined,
      },
    }))

    return NextResponse.json({ messages })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return NextResponse.json({ error: msg }, { status: 401 })
    }
    console.error('list session messages error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
