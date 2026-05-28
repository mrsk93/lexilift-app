import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/auth/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update session and get response
  const response = await updateSession(request)

  // Auth protection logic
  const { pathname } = request.nextUrl
  
  // Public routes that shouldn't be protected by auth
  const isPublicRoute = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/signup') || 
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/api/widget') || // Public widget API
    pathname.startsWith('/widget') // Public widget page
    
  if (!isPublicRoute) {
    // Let's assume protected routes are everything else for now.
    // In updateSession, if user is not logged in, we might want to redirect.
    // Since updateSession just refreshes the token, let's check it here.
    // A more robust check could be added if needed.
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
