# Codebase Structure

**Analysis Date:** 2026-02-18

## Directory Layout

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with auth context
│   ├── page.tsx           # Main dashboard page
│   ├── globals.css        # Global styles (Tailwind + SDK imports)
│   └── api/
│       └── example/       # Example CRUD endpoints
│           └── route.ts   # GET/POST handlers for items
└── lib/
    └── db/
        ├── index.ts       # Database connection, re-exports
        └── schema.ts      # Drizzle ORM schema with RLS columns
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router containing pages and API routes
- Contains: Server components (`.tsx`), API handlers (`route.ts`), global styles
- Key files: `layout.tsx` (root), `page.tsx` (dashboard), `api/example/route.ts` (CRUD)

**`src/app/api/`:**
- Purpose: API endpoints for programmatic access
- Contains: Route handlers organized by feature/resource
- Key files: `example/route.ts` (example CRUD operations)

**`src/lib/`:**
- Purpose: Shared utilities, configuration, and infrastructure
- Contains: Database setup, schema definitions, helpers
- Key files: `db/index.ts` (connection), `db/schema.ts` (tables)

**`src/lib/db/`:**
- Purpose: Database layer - connection pooling, ORM setup, schema
- Contains: Drizzle configuration, table definitions, type exports
- Key files: `index.ts` (connection), `schema.ts` (tables)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout - renders all pages, retrieves auth context
- `src/app/page.tsx`: Dashboard - main app page, demonstrates data fetching and UI
- `src/app/api/example/route.ts`: API endpoint - GET/POST CRUD operations

**Configuration:**
- `tsconfig.json`: TypeScript compiler settings, path aliases (`@/*`)
- `next.config.ts`: Next.js configuration, SDK package transpilation
- `drizzle.config.ts`: Drizzle ORM migrations configuration
- `tailwind.config.ts`: Tailwind CSS configuration (imported from SDK)

**Core Logic:**
- `src/app/page.tsx`: Business logic for dashboard - auth check, data fetching with `withTenant()`, stat calculations
- `src/app/api/example/route.ts`: API logic - authentication, request validation, database operations
- `src/lib/db/schema.ts`: Data model - table definitions, type inference

**Database:**
- `src/lib/db/index.ts`: Database connection using `postgres` client and `drizzle-orm`
- `src/lib/db/schema.ts`: Drizzle schema with example table and RLS columns

**Styling:**
- `src/app/globals.css`: Global styles importing Tailwind and SDK styles

## Naming Conventions

**Files:**
- Server components: `[name].tsx` (e.g., `page.tsx`, `layout.tsx`)
- API routes: `route.ts` in `api/[resource]/` directory
- Schema files: `schema.ts` for Drizzle definitions
- Database files: `index.ts` for exports, `schema.ts` for models

**Directories:**
- API resource directories: `api/[resource-name]/` containing `route.ts`
- Feature directories: Organized by feature or domain (not present in template, but pattern for expansion)
- Library directories: `lib/[concern]/` (e.g., `lib/db/` for database)

**Tables:**
- Prefix with app slug: `example_items` (format: `[app-slug]_[resource]`)
- Suffix singular: `items` not `itemss`
- Use snake_case for column names: `tenant_id`, `created_at`, `updated_at`

**Types:**
- Inferred from Drizzle: `ExampleItem` (select type), `NewExampleItem` (insert type)
- Named after table: `typeof exampleItems.$inferSelect`

## Where to Add New Code

**New Feature:**
- Primary code: Create page component in `src/app/[feature]/page.tsx`
- Tests: Co-locate test files as `[name].test.tsx` or `[name].spec.tsx` (test setup not in template)
- API endpoints: Add directory `src/app/api/[feature]/route.ts` with GET/POST/PUT/DELETE handlers

**New Component/Module:**
- Implementation: Create in `src/app/` for page-specific, or `src/components/` for reusable (create directory as needed)
- Styling: Use Tailwind CSS classes directly or `cn()` from `@madebykav/ui` for conditional classes
- Export: Use named exports for functions/components, default for single-export files

**New Database Table:**
- Definition: Add to `src/lib/db/schema.ts`
- Include: `id` (uuid), `tenantId` (uuid, required), timestamps (`createdAt`, `updatedAt`)
- RLS Policy: Apply with `tenantRlsPolicy('[table-name]')` after `pnpm db:push`
- Prefix: Use `[app-slug]_[resource]` naming (e.g., `example_orders`)

**Utilities:**
- Shared helpers: Create in `src/lib/` subdirectory (e.g., `src/lib/utils/`, `src/lib/helpers/`)
- Import path: Use `@/lib/` alias (e.g., `import { helper } from '@/lib/utils'`)

**API Helpers:**
- Middleware/utility functions: Create in `src/lib/api/` (not present in template)
- Response formatting: Keep in individual route handlers or extract to `src/lib/api/responses.ts`

## Special Directories

**`src/app/api/`:**
- Purpose: API route handlers for external clients
- Generated: No, hand-written
- Committed: Yes, part of source

**`src/lib/db/`:**
- Purpose: Database connection and schema definitions
- Generated: `schema.ts` written by hand, migrations in `drizzle/` (generated by CLI)
- Committed: `index.ts` and `schema.ts` yes, `drizzle/` migrations yes

**`drizzle/`:**
- Purpose: Generated migration files
- Generated: Yes, by `pnpm db:generate`
- Committed: Yes, to track schema history

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes, by `pnpm build` or `pnpm dev`
- Committed: No, in `.gitignore`

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes, by `pnpm install`
- Committed: No, in `.gitignore`

## Path Aliases

TypeScript path alias defined in `tsconfig.json`:
- `@/*` → `src/*`

Usage:
- `import { db } from '@/lib/db'` instead of `import { db } from '../../../lib/db'`

## Recommended File Structure for Growth

As the app grows, organize by feature:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── [feature]/
│   │   ├── page.tsx
│   │   └── components/
│   │       └── [FeatureName].tsx
│   └── api/
│       ├── example/
│       │   └── route.ts
│       └── [feature]/
│           └── route.ts
├── lib/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── api/
│   │   └── [helpers].ts
│   └── utils/
│       └── [utilities].ts
└── components/
    └── [SharedComponent].tsx
```

---

*Structure analysis: 2026-02-18*
