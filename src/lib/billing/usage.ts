import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'

export async function incrementUsage(orgId: string): Promise<void> {
  await db
    .update(organizations)
    .set({ queryCount: sql`${organizations.queryCount} + 1` })
    .where(eq(organizations.id, orgId))
}

export async function resetOrgUsage(orgId: string): Promise<void> {
  await db
    .update(organizations)
    .set({ queryCount: 0, queryResetAt: sql`now() + interval '1 month'` })
    .where(eq(organizations.id, orgId))
}
