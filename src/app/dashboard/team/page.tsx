import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TeamDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage your organization members and invites.</p>
      </div>

      <Card className="shadow-none border-border">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>View and manage people in your current workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            Team management functionality is coming soon.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
