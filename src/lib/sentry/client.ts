import * as Sentry from '@sentry/nextjs'

export function captureClientError(err: unknown): void {
  Sentry.captureException(err)
}

export function setClientUser(user: { id: string; email?: string | null }): void {
  Sentry.setUser({ id: user.id, email: user.email ?? undefined })
}

export function clearClientUser(): void {
  Sentry.setUser(null)
}
