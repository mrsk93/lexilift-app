import Link from 'next/link'
import { createClient } from '@/lib/auth/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page not found',
  description: "We couldn&apos;t find that page.",
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const homeHref = user ? '/dashboard' : '/'

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-3xl">404</CardTitle>
          <CardDescription>We couldn&apos;t find that page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={homeHref}>
            <Button className="w-full">
              {user ? 'Back to dashboard' : 'Back to home'}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
