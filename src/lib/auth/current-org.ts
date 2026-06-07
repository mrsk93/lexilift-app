import { db } from '@/lib/db/client'
import { memberships, profiles } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { createClient } from './supabase/server'

export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profileRows = await db
    .select({ currentOrgId: profiles.currentOrgId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  const storedOrgId = profileRows[0]?.currentOrgId ?? null
  if (storedOrgId) return storedOrgId

  const firstMembership = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .orderBy(asc(memberships.createdAt))
    .limit(1)

  const fallbackOrgId = firstMembership[0]?.orgId ?? null
  if (!fallbackOrgId) {
    throw new Error('User has no organization membership')
  }

  await db
    .update(profiles)
    .set({ currentOrgId: fallbackOrgId })
    .where(eq(profiles.id, user.id))

  return fallbackOrgId
}
