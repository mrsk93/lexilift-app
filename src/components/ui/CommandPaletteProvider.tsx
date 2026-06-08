'use client'
import { useRouter } from 'next/navigation'
import { FileText, MessageCircle, BarChart3, Users, Settings, CreditCard, Code2 } from 'lucide-react'
import { CommandPalette, type CommandItem } from './CommandPalette'

export function CommandPaletteProvider() {
  const router = useRouter()
  const items: CommandItem[] = [
    { id: 'docs', label: 'Documents', onSelect: () => router.push('/dashboard/documents'), group: 'Navigate', icon: <FileText className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', onSelect: () => router.push('/dashboard/chat'), group: 'Navigate', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'widgets', label: 'Widgets', onSelect: () => router.push('/dashboard/widget'), group: 'Navigate', icon: <Code2 className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', onSelect: () => router.push('/dashboard/analytics'), group: 'Navigate', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'team', label: 'Team', onSelect: () => router.push('/dashboard/team'), group: 'Navigate', icon: <Users className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', onSelect: () => router.push('/dashboard/billing'), group: 'Navigate', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', onSelect: () => router.push('/dashboard/settings'), group: 'Navigate', icon: <Settings className="w-4 h-4" /> },
  ]
  return <CommandPalette items={items} />
}
