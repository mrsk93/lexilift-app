import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MembersTable, type Member } from './MembersTable'

const baseMember: Member = {
  id: 'm1',
  userId: 'u1',
  name: 'Alice',
  role: 'owner',
  joinedAt: new Date('2026-01-01T00:00:00Z'),
}

describe('MembersTable', () => {
  it('renders member name', () => {
    render(<MembersTable members={[baseMember]} currentUserRole="owner" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('hides remove button for non-admin viewers', () => {
    const member: Member = { ...baseMember, id: 'm2', name: 'Bob', role: 'member' }
    render(<MembersTable members={[member]} currentUserRole="member" />)
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('shows remove button for admins viewing non-owner members', () => {
    const member: Member = { ...baseMember, id: 'm3', name: 'Bob', role: 'member' }
    render(<MembersTable members={[member]} currentUserRole="admin" />)
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('hides remove button for owners themselves', () => {
    render(<MembersTable members={[baseMember]} currentUserRole="owner" />)
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })
})
