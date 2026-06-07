'use client'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function SettingsClient({ initialModel = 'gpt-4o' }: { initialModel?: string }) {
  const [model, setModel] = useState(initialModel)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const r = await fetch('/api/organizations/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llmModel: model }),
    })
    setLoading(false)
    if (!r.ok) { toast.error('Save failed'); return }
    toast.success('Settings saved')
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace preferences and defaults.</p>
      </div>
      <Card className="shadow-none border-border">
        <CardHeader>
          <CardTitle>AI Model Preferences</CardTitle>
          <CardDescription>Choose the default LLM to power your RAG chat and widget responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="llm-model">Default Model</Label>
            <Select value={model} onValueChange={(v) => v && setModel(v)}>
              <SelectTrigger id="llm-model" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">OpenAI GPT-4o (Recommended)</SelectItem>
                <SelectItem value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="gemini-1.5-pro">Google Gemini 1.5 Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
