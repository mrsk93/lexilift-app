import { db } from '@/lib/db/client'
import { auditEvents } from '@/lib/db/schema'
import { headers } from 'next/headers'

export interface AuditInput {
  orgId: string
  actorId: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(input: AuditInput): Promise<void> {
  let ip: string | null = null
  let userAgent: string | null = null
  try {
    const h = await headers()
    ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip')?.trim() ??
      null
    userAgent = h.get('user-agent') ?? null
  } catch {
    ip = null
    userAgent = null
  }

  await db.insert(auditEvents).values({
    orgId: input.orgId,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? null,
    ip,
    userAgent,
  })
}
