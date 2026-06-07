import { db } from '@/lib/db/client'
import { memberships, profiles } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { createClient } from './supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const profileData = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  return profileData[0] || null
}

export async function getUserRole(orgId: string, userId: string) {
  const membershipData = await db.select()
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    .limit(1)
  
  return membershipData[0]?.role || null
}

export async function isOwner(orgId: string, userId: string) {
  const role = await getUserRole(orgId, userId)
  return role === 'owner'
}

export async function isAdmin(orgId: string, userId: string) {
  const role = await getUserRole(orgId, userId)
  return role === 'owner' || role === 'admin'
}

export async function isMember(orgId: string, userId: string) {
  const role = await getUserRole(orgId, userId)
  return role === 'owner' || role === 'admin' || role === 'member'
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireOrgAccess(orgId: string) {
  const user = await requireAuth()
  const hasAccess = await isMember(orgId, user.id)
  if (!hasAccess) throw new Error('Forbidden')
  return user
}

export async function getMembershipContext(orgId: string) {
  const user = await requireAuth()
  const role = await getUserRole(orgId, user.id)
  if (!role) throw new Error('Forbidden')
  return { userId: user.id, orgId, role }
}

export async function requireOrgMember(orgId: string) {
  return getMembershipContext(orgId)
}

export async function requireOrgAdmin(orgId: string) {
  const ctx = await getMembershipContext(orgId)
  if (ctx.role !== 'owner' && ctx.role !== 'admin') throw new Error('Forbidden')
  return ctx
}
