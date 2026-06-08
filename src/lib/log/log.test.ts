import { describe, it, expect, vi } from 'vitest'

vi.mock('pino', () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }
  return { default: vi.fn(() => logger), pino: vi.fn(() => logger) }
})

import { logger, withRequest } from './log'

describe('logger', () => {
  it('logger is defined with log methods', () => {
    expect(logger.info).toBeDefined()
    expect(logger.warn).toBeDefined()
    expect(logger.error).toBeDefined()
    expect(logger.child).toBeDefined()
  })

  it('logger.info is callable with an object context', () => {
    logger.info({ email: 'a@b.c', token: 'tok' }, 'msg')
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.c', token: 'tok' }),
      'msg'
    )
  })

  it('withRequest returns a child logger with the requestId bound', () => {
    const c = withRequest('r1')
    expect(c).toBeDefined()
    expect(logger.child).toHaveBeenCalledWith({ requestId: 'r1' })
  })
})
