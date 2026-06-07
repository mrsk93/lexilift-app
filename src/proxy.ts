import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/auth/supabase/middleware'

const PUBLIC_PREFIXES = [
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/api/auth', '/widget', '/api/widget',
  '/api/inngest', '/api/cron', '/api/webhooks',
  '/_next', '/favicon',
]

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return response
  if (pathname === '/' || pathname.startsWith('/api/health')) return response

  const user = (response as any)._user
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
