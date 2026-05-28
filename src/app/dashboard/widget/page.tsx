'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, CheckCircle2 } from 'lucide-react'

export default function WidgetDashboardPage() {
  const [token, setToken] = useState('wg_mock12345') // Replace with real token logic
  const [primaryColor, setPrimaryColor] = useState('#006c49') // LexiLift Emerald Green
  const [greeting, setGreeting] = useState('Hi! Ask me anything about our docs.')
  const [domains, setDomains] = useState('example.com, myapp.io')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const embedCode = `<iframe 
  src="http://localhost:3000/widget?token=${token}&color=${encodeURIComponent(primaryColor)}&greeting=${encodeURIComponent(greeting)}"
  width="400"
  height="600"
  style="border: none; position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);"
  allow="clipboard-write"
></iframe>`

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setLoading(true)
    // Save settings to DB
    await new Promise(r => setTimeout(r, 600))
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Widget Configuration</h1>
        <p className="text-muted-foreground">Customize and deploy your chat widget.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="shadow-none border-border">
            <CardHeader>
              <CardTitle>Customization</CardTitle>
              <CardDescription>Adjust the appearance and behavior of your widget.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="color">Primary Color</Label>
                <div className="flex gap-4">
                  <Input 
                    type="color" 
                    id="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Input 
                  id="greeting" 
                  value={greeting} 
                  onChange={(e) => setGreeting(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domains">Allowed Domains (Comma separated)</Label>
                <Input 
                  id="domains" 
                  value={domains} 
                  onChange={(e) => setDomains(e.target.value)} 
                  placeholder="example.com, docs.myapp.com"
                />
                <p className="text-xs text-muted-foreground">Only these domains will be able to load the widget. Use * for any domain.</p>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Configuration'}
                </Button>
                {saved && <span className="text-sm font-medium text-primary flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border">
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>Copy and paste this snippet into your website's &lt;body&gt; tag.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea 
                  readOnly 
                  value={embedCode} 
                  className="font-mono text-sm h-48 bg-muted/50 resize-none pr-12"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 hover:bg-background/80 backdrop-blur-sm"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-primary font-medium text-right mt-1">Copied to clipboard!</p>}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-none border-border h-full bg-muted/20">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>See how your widget will look on your site.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white animate-pulse"
                style={{ backgroundColor: primaryColor }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
