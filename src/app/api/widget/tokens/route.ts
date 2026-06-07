import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { requireOrgAdmin, requireOrgMember } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { db } from '@/lib/db/client'
import { widgetTokens } from '@/lib/db/schema'

const createSchema = z.object({
  name: z.string().min(1).max(40),
  allowedOrigins: z.array(z.string().url()).optional(),
})

function generateToken() {
  return `wg_${randomBytes(16).toString('hex')}`
}

export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })
    await requireOrgMember(orgId)

    const rows = await db
      .select()
      .from(widgetTokens)
      .where(eq(widgetTokens.orgId, orgId))
      .orderBy(desc(widgetTokens.createdAt))

    return NextResponse.json(rows)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal error'
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 })
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })
    await requireOrgAdmin(orgId)

    const parsed = createSchema.parse(await req.json())

    const [row] = await db
      .insert(widgetTokens)
      .values({
        orgId,
        token: generateToken(),
        name: parsed.name,
        allowedOrigins: parsed.allowedOrigins ?? [],
      })
      .returning()

    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
    }
    const message = e instanceof Error ? e.message : 'Internal error'
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 })
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
