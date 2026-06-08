import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    environment: process.env.SENTRY_ENV ?? 'development',
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENV === 'preview',
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url)
          for (const k of ['token', 'code', 'api_key']) u.searchParams.delete(k)
          event.request.url = u.toString()
        } catch {}
      }
      return event
    },
  })
}
