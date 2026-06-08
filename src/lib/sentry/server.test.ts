import { describe, it, expect, vi } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import { captureError, setUserContext, clearUserContext } from './server'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}))

describe('Sentry server wrapper', () => {
  it('captureError calls Sentry.captureException with extras', () => {
    const e = new Error('boom')
    captureError(e, { route: '/x', orgId: 'o1' })
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
      e,
      expect.objectContaining({ extra: { route: '/x', orgId: 'o1' } }),
    )
  })

  it('captureError works without extras', () => {
    const e = new Error('solo')
    captureError(e)
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
      e,
      expect.objectContaining({ extra: undefined }),
    )
  })

  it('setUserContext calls Sentry.setUser with id and normalized email', () => {
    setUserContext({ id: 'u1', email: 'a@b.c' })
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith({
      id: 'u1',
      email: 'a@b.c',
    })
  })

  it('setUserContext omits email when null is passed', () => {
    setUserContext({ id: 'u2', email: null })
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith({
      id: 'u2',
      email: undefined,
    })
  })

  it('clearUserContext calls Sentry.setUser(null)', () => {
    clearUserContext()
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith(null)
  })
})
