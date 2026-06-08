import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }))

vi.mock('@/lib/db/client', () => ({ db: { select: mockSelect } }))

import { exportUserData } from './export'

function chainTo(rows: unknown) {
  const chain: Record<string, unknown> & { then: Promise<unknown>['then'] } = {
    from: () => chain,
    where: () => chain,
    limit: () => rows,
    innerJoin: () => chain,
    orderBy: () => chain,
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  }
  return chain
}

const profileRow = { id: 'u1', fullName: 'A B', avatarUrl: null, currentOrgId: 'o1' }
const membershipRows = [{ id: 'm1', orgId: 'o1', userId: 'u1', role: 'owner' }]
const orgRows = [{ id: 'o1', name: 'Acme' }]
const docRows = [{ id: 'd1', orgId: 'o1', name: 'A' }]
const sessionRows = [{ id: 's1', userId: 'u1', title: 'Q1' }]
const messageRows = [{ id: 'msg1', sessionId: 's1', role: 'user', content: 'hi' }]
const widgetRows = [{ id: 'w1', orgId: 'o1', token: 'tok' }]
const invoiceRows = [{ id: 'inv1', orgId: 'o1', amountCents: 1000 }]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportUserData', () => {
  it('returns a bundle with profile, memberships, organizations, documents, chatSessions, chatMessages, widgetTokens, invoices, exportedAt', async () => {
    mockSelect
      .mockReturnValueOnce(chainTo([profileRow]))
      .mockReturnValueOnce(chainTo(membershipRows))
      .mockReturnValueOnce(chainTo(orgRows))
      .mockReturnValueOnce(chainTo(docRows))
      .mockReturnValueOnce(chainTo(sessionRows))
      .mockReturnValueOnce(chainTo(messageRows))
      .mockReturnValueOnce(chainTo(widgetRows))
      .mockReturnValueOnce(chainTo(invoiceRows))

    const result = await exportUserData('u1')

    expect(result.profile).toEqual(profileRow)
    expect(result.memberships).toEqual(membershipRows)
    expect(result.organizations).toEqual(orgRows)
    expect(result.documents).toEqual(docRows)
    expect(result.chatSessions).toEqual(sessionRows)
    expect(result.chatMessages).toEqual(messageRows)
    expect(result.widgetTokens).toEqual(widgetRows)
    expect(result.invoices).toEqual(invoiceRows)
    expect(result.exportedAt).toEqual(expect.any(String))
    expect(new Date(result.exportedAt).toString()).not.toBe('Invalid Date')
  })

  it('skips org-scoped queries when user has no memberships', async () => {
    mockSelect
      .mockReturnValueOnce(chainTo([profileRow]))
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo(sessionRows))
      .mockReturnValueOnce(chainTo(messageRows))

    const result = await exportUserData('u1')

    expect(mockSelect).toHaveBeenCalledTimes(4)
    expect(result.organizations).toEqual([])
    expect(result.documents).toEqual([])
    expect(result.widgetTokens).toEqual([])
    expect(result.invoices).toEqual([])
  })

  it('skips message query when user has no chat sessions', async () => {
    mockSelect
      .mockReturnValueOnce(chainTo([profileRow]))
      .mockReturnValueOnce(chainTo(membershipRows))
      .mockReturnValueOnce(chainTo(orgRows))
      .mockReturnValueOnce(chainTo(docRows))
      .mockReturnValueOnce(chainTo([]))
      .mockReturnValueOnce(chainTo(widgetRows))
      .mockReturnValueOnce(chainTo(invoiceRows))

    const result = await exportUserData('u1')

    expect(result.chatSessions).toEqual([])
    expect(result.chatMessages).toEqual([])
  })
})
