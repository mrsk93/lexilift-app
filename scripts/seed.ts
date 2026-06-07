import 'dotenv/config'
import { db } from '../src/lib/db/client'
import {
  organizations,
  profiles,
  memberships,
  documents,
  chatSessions,
  widgetTokens,
} from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

async function main() {
  console.log('Seeding…')

  const ownerId = uuid()
  await db
    .insert(profiles)
    .values({
      id: ownerId,
      fullName: 'Seed Owner',
      currentOrgId: null,
    })
    .onConflictDoNothing()

  const starterId = uuid()
  const proId = uuid()

  await db.insert(organizations).values([
    {
      id: starterId,
      name: 'Starter Workspace',
      slug: `starter-${Date.now()}`,
      plan: 'starter',
      createdBy: ownerId,
      documentsCount: 0,
    },
    {
      id: proId,
      name: 'Pro Workspace',
      slug: `pro-${Date.now()}`,
      plan: 'pro',
      createdBy: ownerId,
      queryLimit: 5000,
      documentsCount: 0,
    },
  ])

  await db.insert(memberships).values([
    { orgId: starterId, userId: ownerId, role: 'owner' },
    { orgId: proId, userId: ownerId, role: 'owner' },
  ])

  await db
    .update(profiles)
    .set({ currentOrgId: starterId })
    .where(eq(profiles.id, ownerId))

  for (const orgId of [starterId, proId]) {
    for (let i = 0; i < 3; i++) {
      await db.insert(documents).values({
        orgId,
        name: `sample-${i}.pdf`,
        fileType: 'application/pdf',
        status: 'ready',
        chunkCount: 10,
        fileSize: 1024 * 100,
        uploadedBy: ownerId,
        fileUrl: 'https://example.com/sample.pdf',
      })
    }
    await db.insert(widgetTokens).values({
      orgId,
      token: `wt_${orgId.slice(0, 8)}`,
      name: 'Default',
      isActive: true,
      primaryColor: '#006c49',
      welcomeMessage: 'Hi! Ask me anything.',
      rateLimitPerMin: 10,
    })
    await db.insert(chatSessions).values({
      orgId,
      userId: ownerId,
      source: 'dashboard',
      title: 'Welcome',
      llmModel: 'gpt-4o',
    })
  }

  console.log(
    `Seeded:\n  owner: ${ownerId}\n  starter: ${starterId}\n  pro: ${proId}`
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
