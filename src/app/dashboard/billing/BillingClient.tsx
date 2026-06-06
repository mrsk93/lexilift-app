'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Zap } from 'lucide-react'
import { createProCheckoutAction } from './actions'

interface BillingClientProps {
  org: {
    plan: string | null;
    queryCount: number | null;
    queryLimit: number | null;
  }
}

export function BillingClient({ org }: BillingClientProps) {
  const [loading, setLoading] = useState(false)

  const currentPlan = org.plan || 'starter'
  const queryLimit = org.queryLimit ?? 500
  const queryCount = org.queryCount ?? 0

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const { url } = await createProCheckoutAction()
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout:', error)
      setLoading(false)
    }
  }

  const usagePercent = Math.min((queryCount / queryLimit) * 100, 100)
  const isNearLimit = usagePercent > 80

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
              <CardDescription>Your query usage for the current billing cycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Queries Used</p>
                  <p className="text-3xl font-bold font-mono">
                    {queryCount} <span className="text-lg text-muted-foreground font-normal">/ {queryLimit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${isNearLimit ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {usagePercent.toFixed(1)}% Used
                  </span>
                </div>
              </div>
              <Progress value={usagePercent} className={`h-2 ${isNearLimit ? '[&>div]:bg-destructive' : ''}`} />
              
              {isNearLimit && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mt-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Approaching limits</h4>
                    <p className="text-sm text-destructive/80 mt-1">You've used over 80% of your included queries. Upgrade your plan to avoid service interruption.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-xl font-heading font-bold mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Starter Plan */}
              <Card className={`shadow-none border-border relative ${currentPlan === 'starter' ? 'ring-2 ring-primary border-primary' : ''}`}>
                {currentPlan === 'starter' && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    CURRENT
                  </div>
                )}
                <CardHeader>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>Perfect for testing and small projects.</CardDescription>
                  <div className="mt-4 flex items-baseline text-3xl font-bold">
                    $0<span className="text-base text-muted-foreground font-normal ml-1">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 500 queries / month</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 10 documents</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Standard support</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled={currentPlan === 'starter'}>
                    {currentPlan === 'starter' ? 'Current Plan' : 'Downgrade'}
                  </Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className={`shadow-none border-border relative ${currentPlan === 'pro' ? 'ring-2 ring-primary border-primary' : ''}`}>
                {currentPlan === 'pro' && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    CURRENT
                  </div>
                )}
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>For production applications.</CardDescription>
                  <div className="mt-4 flex items-baseline text-3xl font-bold">
                    $29<span className="text-base text-muted-foreground font-normal ml-1">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 5,000 queries / month</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 100 documents</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Priority support</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Custom widget branding</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleUpgrade} 
                    disabled={currentPlan === 'pro' || loading}
                  >
                    {loading ? 'Processing...' : currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                  </Button>
                </CardFooter>
              </Card>
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
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="text-sm mt-1">Visa ending in 4242</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Invoice</p>
                <p className="text-sm mt-1">{currentPlan === 'pro' ? '$29.00' : '$0.00'} on Jul 1, 2026</p>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Update Payment Method
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
