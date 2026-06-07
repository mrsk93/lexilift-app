'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'
import { UsageGauge } from '@/components/billing/UsageGauge'
import { PlanCard } from '@/components/billing/PlanCard'
import { createCheckoutAction } from './actions'
import { toast } from 'sonner'
import type { PlanId } from '@/lib/billing/plans'
import { PLAN_LIMITS } from '@/lib/billing/plans'

interface BillingClientProps {
  org: {
    plan: string | null
    queryCount: number | null
    queryLimit: number | null
  }
  documentsUsed: number
  widgetsUsed: number
}

export function BillingClient({ org, documentsUsed, widgetsUsed }: BillingClientProps) {
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const currentPlan = (org.plan as PlanId) ?? 'starter'
  const queryLimit = org.queryLimit ?? PLAN_LIMITS[currentPlan].queries
  const queryCount = org.queryCount ?? 0
  const docLimit = PLAN_LIMITS[currentPlan].documents
  const widgetLimit = PLAN_LIMITS[currentPlan].widgets

  const onSelect = async (plan: PlanId) => {
    setLoading(true)
    try {
      const { url } = await createCheckoutAction(plan)
      window.location.href = url
    } catch (err) {
      console.error('Checkout failed', err)
      toast.error('Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const r = await fetch('/api/billing/portal', { method: 'POST' })
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({ error: 'Portal unavailable' }))
        throw new Error(error)
      }
      const { url } = await r.json()
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open portal')
      setPortalLoading(false)
    }
  }

  const queryPct = queryLimit === Infinity ? 0 : Math.min((queryCount / queryLimit) * 100, 100)
  const isNearLimit = queryPct > 80

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground">Manage your subscription and usage limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="shadow-none border-border">
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
              <CardDescription>Your usage for the current billing cycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <UsageGauge used={queryCount} limit={queryLimit} label="Queries" />
              <UsageGauge used={documentsUsed} limit={docLimit} label="Documents" />
              <UsageGauge used={widgetsUsed} limit={widgetLimit} label="Widgets" />

              {isNearLimit && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Approaching limits</h4>
                    <p className="text-sm text-destructive/80 mt-1">
                      You&apos;ve used over 80% of your included queries. Upgrade your plan to avoid service interruption.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-xl font-heading font-bold mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {(['starter', 'pro', 'team', 'enterprise'] as PlanId[]).map((p) => (
                <PlanCard key={p} plan={p} current={currentPlan === p} onSelect={onSelect} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <Card className="shadow-none border-border bg-muted/20">
            <CardHeader>
              <CardTitle>Billing details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan</p>
                <p className="text-sm mt-1 capitalize">{currentPlan}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Query Resets</p>
                <p className="text-sm mt-1">1st of next month</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading ? 'Opening…' : 'Manage Billing'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground">Redirecting to checkout…</p>
      )}
    </div>
  )
}
