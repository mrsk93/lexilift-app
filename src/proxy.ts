import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { updateSession } from '@/lib/auth/supabase/middleware'

const PUBLIC_PREFIXES = [
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/api/auth', '/widget', '/api/widget',
  '/api/inngest', '/api/cron', '/api/webhooks',
  '/api/ready',
  '/terms', '/privacy', '/dpa',
  '/_next', '/favicon',
]

export async function proxy(request: NextRequest) {
  const reqId = request.headers.get('x-request-id') ?? randomBytes(8).toString('hex')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', reqId)
  const forwardedRequest = new NextRequest(request, { headers: requestHeaders })
  const response = await updateSession(forwardedRequest)
  const { pathname } = request.nextUrl

  response.headers.set('x-request-id', reqId)
  response.headers.set('x-pathname', pathname)

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
  if (user.email_confirmed_at === null && !pathname.startsWith('/verify-email') && !pathname.startsWith('/api/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-email'
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
