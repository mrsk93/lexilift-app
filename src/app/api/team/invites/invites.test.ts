/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireOrgAdmin,
  mockSendEmail,
  mockDbInsert,
  mockDbSelect,
  mockDbDelete,
  mockRender,
} = vi.hoisted(() => ({
  mockRequireOrgAdmin: vi.fn(),
  mockSendEmail: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbDelete: vi.fn(),
  mockRender: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
    EMAIL_FROM: 'LexiLift <test@test.dev>',
    RESEND_API_KEY: 're_test',
    DATABASE_URL: 'postgresql://test',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon',
  },
}))

vi.mock('@/lib/auth/org-utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/org-utils')>('@/lib/auth/org-utils')
  return {
    ...actual,
    requireOrgAdmin: (...args: unknown[]) => mockRequireOrgAdmin(...args),
  }
})

vi.mock('@/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: mockDbInsert,
    select: mockDbSelect,
    delete: mockDbDelete,
  },
}))

vi.mock('@react-email/render', () => ({
  render: mockRender,
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  mockRender.mockResolvedValue('<html>rendered</html>')
})

describe('Invites API', () => {
  it('creates an invite and emails it', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    mockDbInsert.mockReturnValue({
      values: () => ({ returning: () => [{ id: 'inv1' }] }),
    })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ fullName: 'Sam' }] }) }),
    })
    mockSendEmail.mockResolvedValue('em_x')

    const req = new Request('http://x?orgId=o1', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.dev', role: 'member' }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.id).toBe('inv1')
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it('rejects invalid email', async () => {
    mockRequireOrgAdmin.mockResolvedValue({ userId: 'u1', orgId: 'o1', role: 'owner' })
    const req = new Request('http://x?orgId=o1', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', role: 'member' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
