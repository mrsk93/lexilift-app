import { db } from '@/lib/db/client'
import {
  profiles,
  memberships,
  organizations,
  documents,
  chatSessions,
  chatMessages,
  widgetTokens,
  invoices,
} from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

export interface DataExportBundle {
  profile: typeof profiles.$inferSelect | undefined
  memberships: Array<typeof memberships.$inferSelect>
  organizations: Array<typeof organizations.$inferSelect>
  documents: Array<typeof documents.$inferSelect>
  chatSessions: Array<typeof chatSessions.$inferSelect>
  chatMessages: Array<typeof chatMessages.$inferSelect>
  widgetTokens: Array<typeof widgetTokens.$inferSelect>
  invoices: Array<typeof invoices.$inferSelect>
  exportedAt: string
}

export async function exportUserData(userId: string): Promise<DataExportBundle> {
  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
  const profile = profileRows[0]

  const userMemberships = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
  const orgIds = userMemberships
    .map((m) => m.orgId)
    .filter((id): id is string => id !== null)

  const userOrgs =
    orgIds.length > 0
      ? await db.select().from(organizations).where(inArray(organizations.id, orgIds))
      : []

  const userDocs =
    orgIds.length > 0
      ? await db.select().from(documents).where(inArray(documents.orgId, orgIds))
      : []

  const userSessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
  const sessionIds = userSessions
    .map((s) => s.id)
    .filter((id): id is string => id !== null)

  const userMessages =
    sessionIds.length > 0
      ? await db
          .select()
          .from(chatMessages)
          .where(inArray(chatMessages.sessionId, sessionIds))
      : []

  const userWidgets =
    orgIds.length > 0
      ? await db
          .select()
          .from(widgetTokens)
          .where(inArray(widgetTokens.orgId, orgIds))
      : []

  const userInvoices =
    orgIds.length > 0
      ? await db.select().from(invoices).where(inArray(invoices.orgId, orgIds))
      : []

  return {
    profile,
    memberships: userMemberships,
    organizations: userOrgs,
    documents: userDocs,
    chatSessions: userSessions,
    chatMessages: userMessages,
    widgetTokens: userWidgets,
    invoices: userInvoices,
    exportedAt: new Date().toISOString(),
  }
}
