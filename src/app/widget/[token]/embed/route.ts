import { NextResponse } from 'next/server'
import { buildLoaderScript } from '@/components/widget/WidgetLoader'
import { env } from '@/lib/env'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = buildLoaderScript(token, env.APP_URL)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
