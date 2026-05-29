import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    // Clear any custom cookies or do any additional cleanup if necessary
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
