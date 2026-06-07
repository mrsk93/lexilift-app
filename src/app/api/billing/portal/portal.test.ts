/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetCurrentOrgId,
  mockRequireAuth,
  mockRequireOrgAccess,
  mockGetBilling,
} = vi.hoisted(() => ({
  mockGetCurrentOrgId: vi.fn(),
  mockRequireAuth: vi.fn(),
  mockRequireOrgAccess: vi.fn(),
  mockGetBilling: vi.fn(),
}))

vi.mock('@/lib/auth/current-org', () => ({
  getCurrentOrgId: mockGetCurrentOrgId,
}))

vi.mock('@/lib/auth/org-utils', () => ({
  requireAuth: mockRequireAuth,
  requireOrgAccess: mockRequireOrgAccess,
}))

vi.mock('@/lib/adapters/billing/polar', () => ({
  getBilling: mockGetBilling,
}))

import { POST } from './route'

describe('billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'u1' })
    mockRequireOrgAccess.mockResolvedValue({ id: 'u1' })
    mockGetCurrentOrgId.mockResolvedValue('o1')
    mockGetBilling.mockReturnValue({
      createPortalSession: vi.fn().mockResolvedValue('https://polar.sh/p'),
    })
  })

  it('returns the portal URL', async () => {
    const r = await POST()
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.url).toBe('https://polar.sh/p')
  })

  it('returns 400 when no current org', async () => {
    mockGetCurrentOrgId.mockResolvedValue(null)
    const r = await POST()
    expect(r.status).toBe(400)
  })

  it('returns 404 when NO_CUSTOMER', async () => {
    mockGetBilling.mockReturnValue({
      createPortalSession: vi.fn().mockRejectedValue(new Error('NO_CUSTOMER')),
    })
    const r = await POST()
    expect(r.status).toBe(404)
  })

  it('returns 500 on other errors', async () => {
    mockGetBilling.mockReturnValue({
      createPortalSession: vi.fn().mockRejectedValue(new Error('PORTAL_FAILED')),
    })
    const r = await POST()
    expect(r.status).toBe(500)
  })
})
