import { SignupForm } from './SignupForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : undefined

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
          <SignupForm error={error} />
        </CardContent>
      </Card>
    </div>
  )
}
