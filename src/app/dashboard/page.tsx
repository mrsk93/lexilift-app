export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Monitor your knowledge base usage and activity.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Documents</h3>
          <p className="text-3xl font-heading font-semibold">12</p>
        </div>
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Queries this month</h3>
          <p className="text-3xl font-heading font-semibold">450 <span className="text-sm text-muted-foreground font-normal">/ 1,000</span></p>
        </div>
        <div className="border border-border bg-card p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Widgets</h3>
          <p className="text-3xl font-heading font-semibold">1</p>
        </div>
      </div>
    </div>
  )
}
