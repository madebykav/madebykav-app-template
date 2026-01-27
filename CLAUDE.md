# CLAUDE.md - AI Development Context

This file provides context for AI-assisted development with Claude Code.

## Project Overview

This is a **MadeByKav Platform App** - a tenant-isolated application that runs on the MadeByKav platform. Apps use shared SDK packages for authentication, database access, UI components, and AI capabilities.

**Key Principle:** All data is tenant-isolated via Row-Level Security (RLS). Every query must go through `withTenant()` to ensure data isolation.

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with auth context
│   ├── page.tsx           # Main dashboard page
│   ├── globals.css        # Global styles (imports @madebykav/ui)
│   └── api/               # API routes
│       └── example/       # Example CRUD endpoints
│           └── route.ts
├── lib/
│   └── db/
│       ├── index.ts       # Database connection + re-exports
│       └── schema.ts      # Drizzle schema with tenant columns
└── components/            # App-specific components (create as needed)
```

## SDK Packages

### @madebykav/auth - Authentication

```typescript
import { getAuthContext, requireAuth, AuthContext } from '@madebykav/auth'

// In Server Components - get auth context (never throws)
const auth = await getAuthContext()
// Returns: { tenantId, userId, user, session } or nulls if not authenticated

// In API Routes - require authentication (throws 401 if not auth'd)
const auth = await requireAuth()
// Returns: { tenantId, userId, user, session } - guaranteed non-null
```

### @madebykav/db - Database & Tenant Isolation

```typescript
import { withTenant, withoutRLS, tenantRlsPolicy } from '@madebykav/db'

// ALWAYS use withTenant for queries - ensures tenant isolation
const items = await withTenant(db, tenantId, async (tx) => {
  return tx.select().from(myTable)
})

// Insert with tenant_id
await withTenant(db, tenantId, async (tx) => {
  return tx.insert(myTable).values({
    tenantId: tenantId, // Required!
    ...data
  })
})

// Only for admin operations (never in app code)
// await withoutRLS(db, async (tx) => { ... })

// Apply RLS policy to new tables
await db.execute(tenantRlsPolicy('my_table_name'))
```

### @madebykav/ui - UI Components

```typescript
import { Button, Card, Input, cn } from '@madebykav/ui'

// Components follow shadcn/ui patterns
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>

<Card className="p-6">
  <h2>Title</h2>
  <p>Content</p>
</Card>

<Input placeholder="Enter text..." />

// cn() for conditional classes
<div className={cn("base-class", condition && "conditional-class")} />
```

### @madebykav/ai - AI Chat

```typescript
import { chat, getUsage, ChatOptions } from '@madebykav/ai'

// Chat with AI
const response = await chat({
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'gpt-4o-mini', // Optional, defaults to gpt-4o-mini
  stream: false,
})

// Streaming
const stream = await chat({
  messages,
  stream: true,
})
for await (const chunk of stream) {
  console.log(chunk)
}

// Check usage/budget
const usage = await getUsage()
```

## RLS and Tenant Isolation

**Critical Rules:**

1. **Every table must have a `tenant_id` column** (uuid, not null)
2. **Always query through `withTenant()`** - never query directly
3. **Always include `tenantId` in inserts** - get from auth context
4. **Apply RLS policy after schema push** - `tenantRlsPolicy('table_name')`

**Schema Pattern:**

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const myItems = pgTable('my_app_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),  // REQUIRED
  // ... other columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Table Naming:** Prefix tables with your app slug (e.g., `myapp_items`) to avoid conflicts.

## Common Patterns

### Server Components (Authenticated Data Fetching)

```typescript
import { getAuthContext } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { myTable } from '@/lib/db/schema'

export default async function Page() {
  const auth = await getAuthContext()

  if (!auth.tenantId) {
    return <div>Please log in</div>
  }

  const data = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.select().from(myTable)
  })

  return <div>{/* render data */}</div>
}
```

### Protected API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { myTable } from '@/lib/db/schema'

export async function GET() {
  const auth = await requireAuth() // Throws 401 if not auth'd

  const data = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.select().from(myTable)
  })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  const body = await request.json()

  const [item] = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.insert(myTable).values({
      tenantId: auth.tenantId,
      ...body,
    }).returning()
  })

  return NextResponse.json({ item }, { status: 201 })
}
```

### Form Actions (Server Actions)

```typescript
'use server'

import { requireAuth } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { myTable } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'

export async function createItem(formData: FormData) {
  const auth = await requireAuth()
  const title = formData.get('title') as string

  await withTenant(db, auth.tenantId, async (tx) => {
    return tx.insert(myTable).values({
      tenantId: auth.tenantId,
      title,
    })
  })

  revalidatePath('/')
}
```

## Commands

```bash
# Development
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm db:generate      # Generate migrations from schema changes
pnpm db:push          # Push schema to database (dev only)

# After pushing schema, apply RLS:
# Connect to database and run:
# SELECT create_tenant_policy('your_table_name');
```

## Environment Variables

Required in `.env.local`:

```env
DATABASE_URL=postgresql://...     # Platform database connection
GITHUB_TOKEN=ghp_...              # For npm install of SDK packages
PLATFORM_URL=https://madebykav.com
```

## Things to Avoid

1. **Never query without withTenant()** - breaks tenant isolation
2. **Never hardcode tenant IDs** - always from auth context
3. **Never use withoutRLS()** - that's for admin operations only
4. **Never skip auth checks** - use requireAuth() for protected routes
5. **Never store secrets in code** - use environment variables

## Debugging

**Auth issues:**
- Check if user is logged into platform portal
- Verify session cookie is being sent
- Use `getAuthContext()` to inspect auth state

**Database issues:**
- Verify DATABASE_URL is correct
- Check if RLS policy is applied to table
- Ensure tenant_id is included in inserts

**Build issues:**
- Ensure GITHUB_TOKEN is set for npm install
- Check for TypeScript errors with `pnpm build`
