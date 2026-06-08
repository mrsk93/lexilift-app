'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth/supabase/server'
import { headers } from 'next/headers'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const consent = formData.get('consent')

  if (consent !== 'true') {
    redirect('/signup?error=' + encodeURIComponent('You must agree to the Terms of Service and Privacy Policy'))
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    redirect('/signup?error=Could not create user')
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check email to continue sign in process')
}
