import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { exampleItems, type NewExampleItem } from '@/lib/db/schema'

/**
 * Example protected API route demonstrating:
 * 1. Authentication with requireAuth()
 * 2. Tenant-isolated database queries with withTenant()
 * 3. Standard CRUD operations
 */

// GET /api/example - List items for current tenant
export async function GET() {
  // Require authentication - throws 401 if not authenticated
  const auth = await requireAuth()

  // Query with tenant isolation
  const items = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.select().from(exampleItems)
  })

  return NextResponse.json({ items })
}

// POST /api/example - Create new item
export async function POST(request: NextRequest) {
  const auth = await requireAuth()

  const body = await request.json()
  const { title, description, priority } = body

  if (!title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    )
  }

  // Insert with tenant ID automatically included
  const [item] = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.insert(exampleItems).values({
      tenantId: auth.tenantId,
      title,
      description,
      priority: priority ?? 0,
    } satisfies NewExampleItem).returning()
  })

  return NextResponse.json({ item }, { status: 201 })
}
