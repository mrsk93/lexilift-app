'use client'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PlanId } from '@/lib/billing/plans-data'

const COPY: Record<PlanId, { title: string; price: string; perks: string[]; cta: string; highlighted?: boolean }> = {
  starter:    { title: 'Starter',     price: '$0',    perks: ['10 documents', '500 queries / mo', '1 widget', 'Standard support'], cta: 'Current Plan' },
  pro:        { title: 'Pro',         price: '$29',   perks: ['100 documents', '5,000 queries / mo', '3 widgets', 'Priority support', 'Custom widget branding'], cta: 'Upgrade to Pro', highlighted: true },
  team:       { title: 'Team',        price: '$99',   perks: ['1,000 documents', '50,000 queries / mo', '10 widgets', '10 seats', 'Dedicated support'], cta: 'Upgrade to Team' },
  enterprise: { title: 'Enterprise',  price: 'Custom', perks: ['Unlimited documents & queries', 'Unlimited widgets & seats', 'SSO/SAML', 'SLA & dedicated CSM'], cta: 'Contact Sales' },
}

export function PlanCard({
  plan,
  current,
  onSelect,
}: {
  plan: PlanId
  current: boolean
  onSelect: (p: PlanId) => void
}) {
  const c = COPY[plan]
  return (
    <Card className={`shadow-none border-border relative ${current ? 'ring-2 ring-primary border-primary' : ''} ${c.highlighted && !current ? 'border-emerald-300' : ''}`}>
      {current && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
          CURRENT
        </div>
      )}
      {c.highlighted && !current && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
          POPULAR
        </div>
      )}
      <CardHeader>
        <CardTitle>{c.title}</CardTitle>
        <CardDescription>
          {plan === 'starter' && 'Perfect for testing and small projects.'}
          {plan === 'pro' && 'For production applications.'}
          {plan === 'team' && 'For growing teams.'}
          {plan === 'enterprise' && 'For large organizations with custom needs.'}
        </CardDescription>
        <div className="mt-4 flex items-baseline text-3xl font-bold">
          {c.price}
          {plan !== 'enterprise' && plan !== 'starter' && (
            <span className="text-base text-muted-foreground font-normal ml-1">/mo</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {c.perks.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={c.highlighted && !current ? 'default' : 'outline'}
          disabled={current}
          onClick={() => onSelect(plan)}
        >
          {current ? 'Current Plan' : c.cta}
        </Button>
      </CardFooter>
    </Card>
  )
}
