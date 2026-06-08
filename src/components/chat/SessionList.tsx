'use client'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Session {
  id: string
  title: string | null
  createdAt: string | Date | null
}

export function SessionList({
  sessions,
  activeId,
}: {
  sessions: Session[]
  activeId: string | null
}) {
  const router = useRouter()

  if (sessions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No chats yet.
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {sessions.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/chat/${s.id}`)}
            className={cn(
              'w-full text-left text-sm px-2 py-2 rounded hover:bg-muted flex items-start gap-2 transition-colors',
              activeId === s.id && 'bg-muted font-medium'
            )}
          >
            <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{s.title ?? 'New chat'}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
