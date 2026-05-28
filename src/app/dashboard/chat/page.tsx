import { ChatWindow } from '@/components/chat/ChatWindow'

export default function ChatPage() {
  const orgId = "mock-org-id" // Replace with real org ID

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
