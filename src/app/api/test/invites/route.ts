import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { invites } from '@/lib/db/schema'

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }
  if (process.env.ENABLE_TEST_ROUTES !== '1') {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = new URL(req.url)
  const email = url.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const [row] = await db
    .select()
    .from(invites)
    .where(eq(invites.email, email))
    .orderBy(desc(invites.createdAt))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: 'no invite' }, { status: 404 })
  }

  return NextResponse.json({ token: row.id })
}
