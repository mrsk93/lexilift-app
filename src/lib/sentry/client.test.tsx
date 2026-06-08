import { describe, it, expect, vi } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import { captureClientError, setClientUser, clearClientUser } from './client'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}))

describe('Sentry client wrapper', () => {
  it('captureClientError calls Sentry.captureException with the error', () => {
    const e = new Error('client boom')
    captureClientError(e)
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(e)
  })

  it('setClientUser calls Sentry.setUser with id and email', () => {
    setClientUser({ id: 'u1', email: 'a@b.c' })
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith({
      id: 'u1',
      email: 'a@b.c',
    })
  })

  it('setClientUser normalizes null email to undefined', () => {
    setClientUser({ id: 'u2', email: null })
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith({
      id: 'u2',
      email: undefined,
    })
  })

  it('clearClientUser calls Sentry.setUser(null)', () => {
    clearClientUser()
    expect(vi.mocked(Sentry.setUser)).toHaveBeenCalledWith(null)
  })
})
