'use client'

import { useRouter } from 'next/navigation'
import { CreateTokenDialog } from './CreateTokenDialog'
import { WidgetTokensTable, type WidgetToken } from './WidgetTokensTable'

interface Props {
  tokens: WidgetToken[]
  appUrl: string
}

export function WidgetDashboardClient({ tokens, appUrl }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-heading font-bold tracking-tight">Widgets</h1>
          <p className="text-muted-foreground">
            Embed LexiLift on your site. Use one token per origin.
          </p>
        </div>
        <CreateTokenDialog onCreated={refresh} />
      </div>
      <WidgetTokensTable tokens={tokens} appUrl={appUrl} onDeleted={refresh} />
    </div>
  )
}
