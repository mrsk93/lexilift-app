import { ChatWindow } from '@/components/chat/ChatWindow'
import { getCurrentOrgId } from '@/lib/auth/current-org'

export default async function ChatPage() {
  const orgId = await getCurrentOrgId()
  if (!orgId) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">Ask questions about your documents.</p>
      </div>

      <ChatWindow orgId={orgId} />
    </div>
  )
}
