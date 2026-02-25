import { getAuthContext } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { Button, Card } from '@madebykav/ui'
import { db } from '@/lib/db'
import { exampleItems } from '@/lib/db/schema'

export default async function DashboardPage() {
  const auth = await getAuthContext()

  if (!auth) {
    return (
      <main className="container mx-auto p-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Not Authenticated</h2>
          <p className="text-muted-foreground">
            Please log in through the platform portal.
          </p>
        </Card>
      </main>
    )
  }

  const items = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.select({
      id: exampleItems.id,
      title: exampleItems.title,
      status: exampleItems.status,
    }).from(exampleItems).limit(5)
  })

  return (
    <main className="container mx-auto p-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {auth.name || auth.email}
          </p>
        </div>

        {/* Auth Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Context</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tenant:</span>
              <p className="font-mono">{auth.tenantSlug}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span>
              <p className="font-mono">{auth.role}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User:</span>
              <p className="font-mono">{auth.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User ID:</span>
              <p className="font-mono text-xs">{auth.userId}</p>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground">Total Items</h3>
            <p className="text-3xl font-bold mt-2">{items.length}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground">Pending</h3>
            <p className="text-3xl font-bold mt-2">
              {items.filter(i => i.status === 'pending').length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground">Completed</h3>
            <p className="text-3xl font-bold mt-2">
              {items.filter(i => i.status === 'completed').length}
            </p>
          </Card>
        </div>

        {/* Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <Button>Create Item</Button>
            <Button variant="secondary">View All</Button>
            <Button variant="outline">Settings</Button>
          </div>
        </Card>

        {/* Recent Items */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Items</h2>
          {items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              No items yet. Create your first item to get started.
            </p>
          )}
        </Card>
      </div>
    </main>
  )
}
