import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase/server'
import { db } from '@/lib/db/client'
import { profiles, organizations, memberships } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email/send'
import { render } from '@react-email/render'
import { WelcomeEmail } from '@/lib/email/templates/welcome'
import { env } from '@/lib/env'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if profile exists
      const existingProfile = await db.select().from(profiles).where(eq(profiles.id, data.user.id)).limit(1)
      
      if (existingProfile.length === 0) {
        // Auto-create profile and default org
        const email = data.user.email || 'User'
        const defaultOrgName = `${email.split('@')[0]}'s Workspace`
        
        // 1. Create org
        const [newOrg] = await db.insert(organizations).values({
          name: defaultOrgName,
          slug: `${email.split('@')[0]}-${Date.now()}`,
          createdBy: data.user.id
        }).returning()

        // 2. Create profile
        await db.insert(profiles).values({
          id: data.user.id,
          fullName: data.user.user_metadata?.full_name || email.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url,
          currentOrgId: newOrg.id
        })

        // 3. Create membership (Owner)
        await db.insert(memberships).values({
          orgId: newOrg.id,
          userId: data.user.id,
          role: 'owner'
        })

        // 4. Send welcome email (non-blocking)
        if (data.user.email) {
          sendEmail({
            to: data.user.email,
            subject: 'Welcome to LexiLift',
            html: await render(
              WelcomeEmail({
                dashboardUrl: `${env.APP_URL}/dashboard`,
                name: data.user.user_metadata?.full_name,
              })
            ),
          }).catch((e) => console.error('Welcome email failed', e))
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`)
}
