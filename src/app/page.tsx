import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Bot, Zap, Shield, Database, LayoutDashboard } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Navigation */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">LexiLift</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Log in
            </Link>
            <Link href="/login?tab=signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
              Turn your docs into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#009667]">smart AI assistant</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Embed a powerful, multi-model RAG chat widget on your website in minutes. No coding required. Built for speed, accuracy, and enterprise-grade security.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login?tab=signup">
                <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/20 transition-all hover:-translate-y-0.5">
                  Start for free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg w-full sm:w-auto">
                  View Features
                </Button>
              </Link>
            </div>
            
            <div className="mt-20 relative max-w-5xl mx-auto">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/20 to-transparent blur-xl"></div>
              <div className="relative rounded-xl border border-border bg-card/50 backdrop-blur-sm p-2 shadow-2xl overflow-hidden ring-1 ring-border">
                <img src="https://placehold.co/1200x600/101827/006c49?text=Dashboard+Preview" alt="LexiLift Dashboard Preview" className="w-full rounded-lg border border-border/50" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4">Everything you need to launch AI support</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                LexiLift combines industry-leading LLMs with a high-performance vector pipeline to deliver accurate answers instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card border border-border rounded-xl p-8 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">Seamless Ingestion</h3>
                <p className="text-muted-foreground">Upload PDFs, Word docs, Markdown, or scrape URLs. Our pipeline chunks, embeds, and stores your data automatically.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-8 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <LayoutDashboard className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">Embeddable Widget</h3>
                <p className="text-muted-foreground">Customize the colors, greetings, and behavior. Then just copy-paste a small snippet to add it to your site.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-8 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">Multi-Model Engine</h3>
                <p className="text-muted-foreground">Switch between OpenAI GPT-4o, Anthropic Claude 3.5, and Google Gemini with a single click. Never get locked in.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground">Start for free, upgrade when you need more power.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="border border-border rounded-2xl p-8">
                <h3 className="text-2xl font-bold font-heading mb-2">Starter</h3>
                <p className="text-muted-foreground mb-6">Perfect for side projects</p>
                <div className="text-4xl font-bold mb-6">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> 500 AI queries</li>
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> 10 document uploads</li>
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Standard support</li>
                </ul>
                <Button className="w-full h-12" variant="outline">Get Started</Button>
              </div>
              
              <div className="border-2 border-primary rounded-2xl p-8 relative shadow-lg shadow-primary/10">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold font-heading mb-2">Pro</h3>
                <p className="text-muted-foreground mb-6">For production applications</p>
                <div className="text-4xl font-bold mb-6">$29<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> 5,000 AI queries</li>
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> 100 document uploads</li>
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Priority support</li>
                  <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Custom branding</li>
                </ul>
                <Button className="w-full h-12 hover:shadow-md transition-shadow">Upgrade to Pro</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/20 py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-80">
            <Bot className="w-5 h-5" />
            <span className="font-heading font-bold text-lg">LexiLift</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LexiLift Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
