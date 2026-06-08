'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConsentCheckbox } from '@/components/auth/ConsentCheckbox'
import { signup } from './actions'

export function SignupForm({ error }: { error?: string }) {
  const [consent, setConsent] = useState(false)

  return (
    <form action={signup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Email
        </Label>
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
        <Label htmlFor="password" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="bg-card text-foreground placeholder:text-muted-foreground/50 border-input h-12 text-base rounded-md focus-visible:ring-ring focus-visible:ring-1"
        />
      </div>

      <input type="hidden" name="consent" value={consent ? 'true' : 'false'} />

      <ConsentCheckbox checked={consent} onChange={setConsent} />

      {error && (
        <div
          role="alert"
          className="text-destructive text-sm bg-destructive/10 p-3 rounded-sm border border-destructive/20"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!consent}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create account
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
