import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase/server'
import { env } from '@/lib/env'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.APP_URL}/api/auth/callback?next=/dashboard`,
    },
  })
  if (error || !data?.url) {
    return NextResponse.json({ error: error?.message ?? 'OAuth init failed' }, { status: 500 })
  }
  return NextResponse.redirect(data.url, 307)
}
