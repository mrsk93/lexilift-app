import Link from 'next/link'
import { signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-none border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight font-heading">
            Create an account
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Enter your email below to create your account and workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="space-y-4">
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
              <Label htmlFor="password" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
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
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-md">
              Create account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground w-full">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
