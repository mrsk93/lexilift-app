import { and, asc, desc, eq } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { chatMessages, chatSessions } from '@/lib/db/schema'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { NewChatButton } from '@/components/chat/NewChatButton'
import { SessionList, type Session } from '@/components/chat/SessionList'
import type { ModelId } from '@/lib/llm/models'

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const profile = await getCurrentProfile()
  if (!profile?.currentOrgId) {
    return (
      <div className="p-8 text-muted-foreground">No active organization.</div>
    )
  }
  const orgId = profile.currentOrgId
  const userId = profile.id

  const [session] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.orgId, orgId),
        eq(chatSessions.userId, userId)
      )
    )
    .limit(1)

  if (!session) {
    return (
      <div className="p-8 text-muted-foreground">Chat session not found.</div>
    )
  }

  const allSessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(
      and(eq(chatSessions.orgId, orgId), eq(chatSessions.userId, userId))
    )
    .orderBy(desc(chatSessions.createdAt))
    .limit(50)

  const sessions: Session[] = allSessions.map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
  }))

  // Load persisted messages in chronological order and shape them as
  // AI SDK v6 UIMessages so ChatWindow can hydrate useChat on mount.
  const messageRows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      citations: chatMessages.citations,
      feedback: chatMessages.feedback,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))

  const initialMessages = messageRows.map((m) => ({
    id: m.id,
    role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'assistant') as
      | 'user'
      | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    metadata: {
      citations: Array.isArray(m.citations) ? m.citations : undefined,
      feedback: m.feedback ?? undefined,
    },
  }))

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 -m-4 md:-m-6 lg:-m-8">
      <aside className="w-64 border-r p-4 space-y-3 overflow-y-auto hidden md:flex md:flex-col bg-muted/30">
        <NewChatButton />
        <SessionList sessions={sessions} activeId={sessionId} />
      </aside>
      <main className="flex-1 min-w-0">
        <ChatWindow
          orgId={orgId}
          sessionId={sessionId}
          model={(session.llmModel ?? 'gpt-4o') as ModelId}
          title={session.title}
          initialMessages={initialMessages}
        />
      </main>
    </div>
  )
}
