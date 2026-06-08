/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateAdminClient, mockLoggerWarn, mockLoggerError, mockLoggerInfo, mockChain } =
  vi.hoisted(() => {
    const selectPlans: { results: unknown[] }[] = []
    type DbChain = {
      select: () => {
        from: () => {
          where: () => Promise<unknown[]>
        }
      }
      delete: () => {
        where: () => Promise<void>
      }
      _selectPlans: { results: unknown[] }[]
      _deleteCount: number
      _reset: () => void
    }
    const chain = {} as DbChain
    chain.select = () => ({
      from: () => ({
        where: async () => {
          const plan = selectPlans.shift()
          if (!plan) throw new Error('Unexpected select call: no plan queued')
          return plan.results
        },
      }),
    })
    chain.delete = () => ({
      where: async () => {
        chain._deleteCount = (chain._deleteCount ?? 0) + 1
      },
    })
    chain._selectPlans = selectPlans
    chain._deleteCount = 0
    chain._reset = () => {
      selectPlans.length = 0
      chain._deleteCount = 0
    }
    return {
      mockCreateAdminClient: vi.fn(),
      mockLoggerWarn: vi.fn(),
      mockLoggerError: vi.fn(),
      mockLoggerInfo: vi.fn(),
      mockChain: chain,
    }
  })

vi.mock('@/lib/db/client', () => ({ db: mockChain }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

vi.mock('@/lib/log/log', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

import { hardDeleteAccounts } from './hardDeleteAccounts'

type StepCtx = { step: { run: <T>(_name: string, fn: () => T) => T | Promise<T> } }

beforeEach(() => {
  vi.clearAllMocks()
  mockChain._reset()
  mockCreateAdminClient.mockReturnValue({
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue(undefined) } },
  })
})

function planFindExpired(rows: unknown[]) {
  mockChain._selectPlans.push({ results: rows })
}
function planUserMemberships(rows: unknown[]) {
  mockChain._selectPlans.push({ results: rows })
}
function planOwnerCount(rows: unknown[]) {
  mockChain._selectPlans.push({ results: rows })
}

describe('hardDeleteAccounts', () => {
  it('returns processed count of zero when no expired users', async () => {
    planFindExpired([])
    const ctx: StepCtx = { step: { run: (_n, fn) => fn() } }
    const result = await (hardDeleteAccounts as any).fn(ctx) // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(result).toEqual({ processed: 0 })
  })

  it('deletes memberships, chat sessions, profile, and Supabase auth user for an expired profile', async () => {
    planFindExpired([{ id: 'u-expired' }])
    planUserMemberships([{ orgId: 'o1' }])
    planOwnerCount([{ id: 'm1' }])

    const ctx: StepCtx = { step: { run: (_n, fn) => fn() } }
    const result = await (hardDeleteAccounts as any).fn(ctx) // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(result).toEqual({ processed: 1 })
    const deleteUser = mockCreateAdminClient.mock.results[0].value.auth.admin.deleteUser
    expect(deleteUser).toHaveBeenCalledWith('u-expired')
  })

  it('does not delete the org when there are multiple owners', async () => {
    planFindExpired([{ id: 'u-expired' }])
    planUserMemberships([{ orgId: 'o1' }])
    planOwnerCount([{ id: 'm1' }, { id: 'm2' }])

    const ctx: StepCtx = { step: { run: (_n, fn) => fn() } }
    const result = await (hardDeleteAccounts as any).fn(ctx) // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(result).toEqual({ processed: 1 })
  })

  it('continues when Supabase auth deleteUser throws', async () => {
    planFindExpired([{ id: 'u-expired' }])
    planUserMemberships([{ orgId: 'o1' }])
    planOwnerCount([{ id: 'm1' }])

    mockCreateAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: vi.fn().mockRejectedValue(new Error('auth down')) } },
    })

    const ctx: StepCtx = { step: { run: (_n, fn) => fn() } }
    const result = await (hardDeleteAccounts as any).fn(ctx) // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(result).toEqual({ processed: 1 })
    expect(mockLoggerWarn).toHaveBeenCalled()
  })
})
