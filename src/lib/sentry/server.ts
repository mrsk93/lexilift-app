import * as Sentry from '@sentry/nextjs'

export function captureError(err: unknown, extras?: Record<string, unknown>): void {
  Sentry.captureException(err, { extra: extras })
}

export function setUserContext(user: { id: string; email?: string | null }): void {
  Sentry.setUser({ id: user.id, email: user.email ?? undefined })
}

export function clearUserContext(): void {
  Sentry.setUser(null)
}
