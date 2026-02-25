# CLAUDE.md - AI Development Context

This file provides context for AI-assisted development with Claude Code.

## Project Overview

This is a **MadeByKav Platform App** -- a tenant-isolated Next.js application that runs on the MadeByKav platform. Each app runs as a Docker container, routed by subdomain (`{app-slug}.madebykav.com`).

**Architecture:** Authentication happens at the proxy layer. The platform runs Caddy as a reverse proxy with an auth-validator middleware. By the time a request reaches your app, the user's identity is already verified and injected as HTTP headers.

```
Browser -> Caddy (reverse proxy) -> Auth Validator -> App Container -> Response
                                         |
                                   Reads session cookie,
                                   injects X-Tenant-Id,
                                   X-User-Id, X-User-Email,
                                   X-User-Name, X-Tenant-Slug,
                                   X-User-Role headers
```

**Key facts:**
- Auth at proxy layer -- apps never validate sessions or cookies
- Each app owns its own PostgreSQL database
- Multiple tenants share the same app instance; RLS ensures data isolation
- All data access goes through `withTenant()` to enforce tenant boundaries

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (synchronous, no auth call)
│   ├── page.tsx                    # Dashboard page
│   ├── globals.css                 # Tailwind v4 + UI theme imports
│   ├── actions/
│   │   └── auth.ts                 # Logout server action
│   └── api/
│       ├── example/
│       │   └── route.ts            # Example CRUD endpoints
│       └── health/
│           ├── route.ts            # Liveness probe (no DB check)
│           └── ready/route.ts      # Readiness probe (checks DB)
├── lib/
│   └── db/
│       ├── index.ts                # Database connection (exports db, Database type)
│       └── schema.ts               # Drizzle schema with declarative RLS
└── components/                     # App-specific components (create as needed)
```

## SDK Packages

### @madebykav/auth (v0.2.0) - Authentication

```typescript
import { getAuthContext, requireAuth, isStandaloneMode, type AuthContext } from '@madebykav/auth'

// AuthContext type:
interface AuthContext {
  tenantId: string      // UUID -- from X-Tenant-Id header
  userId: string        // UUID -- from X-User-Id header
  email: string         // from X-User-Email header
  name: string          // from X-User-Name header
  role: string          // 'platform_admin' | 'tenant_admin' | 'tenant_user'
  tenantSlug: string    // from X-Tenant-Slug header
}

// In Server Components -- returns AuthContext | null
const auth = await getAuthContext()
// Returns null if not authenticated (not an object with null fields)

// In API Routes -- throws 401 if not authenticated
const auth = await requireAuth()
// Returns AuthContext -- guaranteed non-null

// Check if running outside the platform proxy (local dev without proxy)
const standalone = await isStandaloneMode()
```

### @madebykav/db (v0.1.0) - Database & Tenant Isolation

Each app owns its own PostgreSQL database, but multiple tenants share the same app instance. RLS ensures tenant data isolation.

```typescript
import { withTenant, withoutRLS, createTenantPolicy } from '@madebykav/db'

// ALL tenant-scoped queries must use withTenant
const items = await withTenant(db, auth.tenantId, async (tx) => {
  return tx.select().from(myTable)
})

// Inserts must include tenantId
await withTenant(db, auth.tenantId, async (tx) => {
  return tx.insert(myTable).values({ tenantId: auth.tenantId, ...data })
})

// Define RLS declaratively in schema (not via manual SQL)
import { pgTable, pgPolicy, uuid, text } from 'drizzle-orm/pg-core'
import { createTenantPolicy } from '@madebykav/db'

export const myItems = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
}, (table) => [
  pgPolicy('items_tenant_isolation', createTenantPolicy()),
])
```

> Since each app owns its own database, table names don't need app-slug prefixes. Just use clean names like `items`, `contacts`, `settings`.

### @madebykav/ui (v0.1.2) - UI Components

```typescript
import { Button, Card, Input } from '@madebykav/ui'
import { cn } from '@madebykav/ui/lib/utils'

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

## RLS and Tenant Isolation

**Critical Rules:**

1. **Every table must have a `tenant_id` column** (uuid, not null)
2. **Always query through `withTenant()`** -- never query directly
3. **Always include `tenantId` in inserts** -- get from auth context
4. **Define RLS declaratively in schema** -- via `pgPolicy()` + `createTenantPolicy()` as third arg to `pgTable`

**Schema Pattern:**

```typescript
import { pgTable, pgPolicy, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { createTenantPolicy } from '@madebykav/db'

export const myItems = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  // ... other columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  pgPolicy('items_tenant_isolation', createTenantPolicy()),
])
```

## Common Patterns

### Server Components (Authenticated Data Fetching)

```typescript
import { getAuthContext } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { myTable } from '@/lib/db/schema'

export default async function Page() {
  const auth = await getAuthContext()

  if (!auth) {
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
import { NextRequest } from 'next/server'
import { requireAuth } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { myTable, type NewMyItem } from '@/lib/db/schema'

export async function GET() {
  const auth = await requireAuth()

  const data = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.select().from(myTable)
  })

  return Response.json({ data })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  const body = await request.json()

  const [item] = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.insert(myTable).values({
      tenantId: auth.tenantId,
      ...body,
    } satisfies NewMyItem).returning()
  })

  return Response.json({ item }, { status: 201 })
}
```

### Server Actions

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
    return tx.insert(myTable).values({ tenantId: auth.tenantId, title })
  })

  revalidatePath('/')
}
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (http://localhost:3000) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:push` | Push schema to database |
| `./dev.sh` | One-command dev setup (postgres + schema push + dev server) |
| `docker build --secret id=GITHUB_TOKEN,env=GITHUB_TOKEN -t app .` | Build Docker image with BuildKit secrets |
| `docker compose --profile dev up -d` | Start local PostgreSQL (port 5433) |

## Environment Variables

Required in `.env.local`:

```env
# Database -- the app's own PostgreSQL instance
# Local dev: postgresql://devuser:devpassword@localhost:5433/app_dev
# Production: set by platform admin in stack env vars
DATABASE_URL=postgresql://devuser:devpassword@localhost:5433/app_dev

# GitHub Token -- only needed for pnpm install of @madebykav packages
# Create at: https://github.com/settings/tokens (scope: read:packages)
# Add to ~/.npmrc, NOT to .env.local:
#   echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Platform URL -- used for logout redirect and links back to portal
PLATFORM_URL=https://madebykav.com

# App identity
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_APP_SLUG=my-app
```

## Things to Avoid

1. **Never query without `withTenant()`** -- breaks tenant isolation
2. **Never hardcode tenant IDs** -- always from auth context
3. **Never use `withoutRLS()` in app code** -- that's for admin operations only
4. **Never call `getAuthContext()` in the root layout** -- forces every page dynamic
5. **Never validate session cookies in app code** -- the proxy handles auth
6. **Never store secrets in code** -- use environment variables

## Debugging

**Auth issues:**
- Check if user is logged into platform portal
- Verify proxy headers are being forwarded (X-Tenant-Id, X-User-Id, etc.)
- Use `getAuthContext()` to inspect auth state in a page component

**Database issues:**
- Verify DATABASE_URL is correct
- Check if RLS policy is defined in schema (pgPolicy + createTenantPolicy)
- Ensure tenant_id is included in inserts

**Build issues:**
- Ensure GITHUB_TOKEN is set in `~/.npmrc` for npm install
- Check for TypeScript errors with `pnpm build`

## Health Probes

The template includes health check endpoints for container orchestration:

- **`GET /api/health`** -- Liveness probe. Returns `{ status: 'ok' }`. Does NOT check database connectivity (prevents restart loops when DB is temporarily down).
- **`GET /api/health/ready`** -- Readiness probe. Returns `{ status: 'ready' }` after verifying database connectivity. Returns 503 if DB is unreachable.

The Dockerfile includes a `HEALTHCHECK` directive using the liveness probe.

## Advanced: Backend Proxy Pattern

For apps that need a separate backend (Python ML service, heavy processing, etc.):

1. Create a `src/lib/backend-fetch.ts` utility that makes server-side requests to an internal backend URL, injecting auth headers from the request context.
2. Create a catch-all `/api/backend/[...slug]/route.ts` that proxies requests to the backend with auth headers.
3. The backend reads `x-tenant-id` and `x-user-id` from the proxied headers.

This is not needed for most apps -- Next.js API routes + Drizzle handle typical CRUD. Use this pattern when you need a non-JS backend or heavy background processing.
