import { db } from '@/lib/db/client'
import { organizations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const orgId = await getCurrentOrgId()
  let initialModel = 'gpt-4o'
  if (orgId) {
    const rows = await db.select({ llmModel: organizations.llmModel }).from(organizations).where(eq(organizations.id, orgId)).limit(1)
    initialModel = rows[0]?.llmModel ?? 'gpt-4o'
  }
  return <SettingsClient initialModel={initialModel} />
}
