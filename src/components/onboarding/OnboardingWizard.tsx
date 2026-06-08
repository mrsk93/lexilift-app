'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { StepOrg } from './StepOrg'
import { StepUpload } from './StepUpload'
import { StepWidget } from './StepWidget'

export function OnboardingWizard({
  orgId,
  initialName,
}: {
  orgId: string
  initialName: string
}) {
  const [step, setStep] = useState(1)
  const router = useRouter()

  const saveName = async (name: string) => {
    const r = await fetch(`/api/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) {
      toast.error('Could not save workspace name')
      throw new Error('Save failed')
    }
    setStep(2)
  }

  const complete = async () => {
    const r = await fetch(`/api/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingCompletedAt: new Date().toISOString() }),
    })
    if (!r.ok) {
      toast.error('Could not complete onboarding')
      return
    }
    toast.success('Welcome to LexiLift!')
    router.push('/dashboard')
    router.refresh()
  }

  const pct = (step / 3) * 100

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div>
        <Progress value={pct} className="h-1" />
        <p className="text-xs text-muted-foreground mt-2">Step {step} of 3</p>
      </div>
      {step === 1 && <StepOrg initial={initialName} onNext={saveName} />}
      {step === 2 && <StepUpload onNext={() => setStep(3)} />}
      {step === 3 && <StepWidget onDone={complete} />}
    </div>
  )
}
