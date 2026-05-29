'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const [model, setModel] = useState('gpt-4o')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setSuccess(false)
    // In a real app, save to organizations table in DB
    // await fetch('/api/organizations/settings', { method: 'PUT', body: JSON.stringify({ model }) })
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
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
          <CardDescription>
            Choose the default Large Language Model (LLM) to power your RAG chat and widget responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="llm-model">Default Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="llm-model" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">OpenAI GPT-4o (Recommended)</SelectItem>
                <SelectItem value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="gemini-1.5-pro">Google Gemini 1.5 Pro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              All models have access to the same RAG pipeline and document chunks.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
            {success && <span className="text-sm text-primary font-medium">Settings saved!</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
