import { and, desc, eq } from 'drizzle-orm'
import { getCurrentProfile } from '@/lib/auth/org-utils'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'
import { NewChatButton } from '@/components/chat/NewChatButton'
import { SessionList, type Session } from '@/components/chat/SessionList'
import { MessageSquare } from 'lucide-react'

export default async function ChatIndexPage() {
  const profile = await getCurrentProfile()
  if (!profile?.currentOrgId) {
    return (
      <div className="p-8 text-muted-foreground">No active organization.</div>
    )
  }
  const orgId = profile.currentOrgId
  const userId = profile.id

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

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 -m-4 md:-m-6 lg:-m-8">
      <aside className="w-64 border-r p-4 space-y-3 overflow-y-auto hidden md:flex md:flex-col bg-muted/30">
        <NewChatButton />
        <SessionList sessions={sessions} activeId={null} />
      </aside>
      <main className="flex-1 min-w-0 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6 space-y-3">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Start a conversation</h2>
          <p className="text-sm text-muted-foreground">
            {sessions.length > 0
              ? 'Pick a chat on the left, or start a new one.'
              : 'Ask anything about your indexed documents. Upload a PDF or paste a URL first.'}
          </p>
        </div>
      </main>
    </div>
  )
}
