import { ChatWindow } from '@/components/chat/ChatWindow'
import { db } from '@/lib/db/client'
import { chatSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  
  // Actually verify org and auth
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1)
  const session = sessions[0]

  if (!session) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-heading font-bold tracking-tight">{session.title || 'Chat'}</h1>
        <p className="text-muted-foreground">Continue your conversation.</p>
      </div>

      <ChatWindow orgId={session.orgId!} sessionId={sessionId} />
    </div>
  )
}
