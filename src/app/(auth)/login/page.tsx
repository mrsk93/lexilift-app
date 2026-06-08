import Link from 'next/link'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : undefined
  const message = typeof params.message === 'string' ? params.message : undefined

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-none border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight font-heading">
            Welcome back
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Enter your email and password to sign in to LexiLift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/auth/oauth/google"
            className="flex items-center justify-center gap-2 w-full border rounded-md py-2 hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-medium">Continue with Google</span>
          </a>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-mono">or</span>
            </div>
          </div>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                className="bg-card text-foreground placeholder:text-muted-foreground/50 border-input h-12 text-base rounded-md focus-visible:ring-ring focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-card text-foreground placeholder:text-muted-foreground/50 border-input h-12 text-base rounded-md focus-visible:ring-ring focus-visible:ring-1"
              />
            </div>
            
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-sm border border-destructive/20">
                {error}
              </div>
            )}
            {message && (
              <div className="text-primary text-sm bg-primary/10 p-3 rounded-sm border border-primary/20">
                {message}
              </div>
            )}
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-md">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground w-full">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            By signing in you agree to our{' '}
            <Link href="/terms" className="underline hover:text-primary">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-primary">
              Privacy
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
