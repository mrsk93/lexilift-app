import pino from 'pino'

const redact = {
  paths: [
    '*.password',
    '*.token',
    '*.secret',
    '*.authorization',
    'req.headers.cookie',
    'req.headers.authorization',
  ],
  censor: '[REDACTED]',
}

export const logger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact,
  base: {
    service: 'lexilift-web',
    env: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
  },
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
})

export function withRequest(requestId: string) {
  return logger.child({ requestId })
}
