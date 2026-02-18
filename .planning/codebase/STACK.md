# Technology Stack

**Analysis Date:** 2026-02-18

## Languages

**Primary:**
- TypeScript 5.7.3 - All application code and configuration

**Secondary:**
- CSS 4 (via Tailwind) - Styling and theme management

## Runtime

**Environment:**
- Node.js (via pnpm)

**Package Manager:**
- pnpm - Monorepo-compatible package manager
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 15.1.6 - Full-stack React framework with App Router
  - Server Components for data fetching
  - API Routes for protected endpoints
  - Built-in middleware support

**UI:**
- React 19.0.0 - Component library (from @madebykav/ui)
- React DOM 19.0.0 - DOM rendering

**Testing:**
- Not detected - No test framework configured

**Build/Dev:**
- TypeScript 5.7.3 - Type checking and compilation
- Tailwind CSS 4.0.6 - Utility-first CSS framework
- Drizzle Kit 0.30.4 - ORM schema migrations
- Next.js built-in linting (ESLint via next lint)

## Key Dependencies

**Critical:**
- `@madebykav/auth` (latest) - Authentication and session management
  - Provides: `getAuthContext()`, `requireAuth()`
  - Handles tenant context and user session
  - Exports: `AuthContext` type with `{ tenantId, userId, user, session }`

- `@madebykav/db` (latest) - Database connection and tenant isolation
  - Provides: `withTenant()`, `withoutRLS()`, `tenantRlsPolicy()`
  - Row-Level Security implementation
  - Exports: Tenant isolation helpers

- `@madebykav/ui` (latest) - Shared UI component library
  - Provides: Button, Card, Input, cn() utility
  - shadcn/ui pattern with variants
  - Global styles imported in `src/app/globals.css`

- `@madebykav/ai` (latest) - AI chat capabilities
  - Provides: `chat()` function, `getUsage()`
  - Streaming support
  - Model selection (defaults to gpt-4o-mini)

**Infrastructure:**
- `drizzle-orm` 0.38.4 - Type-safe ORM for database operations
  - PostgreSQL-specific: `drizzle-orm/postgres-js`
  - Schema definitions in `src/lib/db/schema.ts`
  - Full type inference for inserts and selects

- `postgres` 3.4.5 - PostgreSQL client
  - Pooled connections for serverless environments
  - Prepared statements disabled for connection pooling compatibility

## Configuration

**Environment:**

Environment variables required in `.env.local`:

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PLATFORM_URL=https://madebykav.com
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_APP_SLUG=my-app
```

- `DATABASE_URL` - PostgreSQL connection string (platform database)
- `GITHUB_TOKEN` - GitHub personal access token with `read:packages` scope (for SDK packages)
- `PLATFORM_URL` - MadeByKav platform URL (default: production)
- `NEXT_PUBLIC_APP_NAME` - Public app display name
- `NEXT_PUBLIC_APP_SLUG` - Public app identifier for URLs

**Build:**
- `tsconfig.json` - TypeScript compiler configuration with strict mode enabled
  - Target: ES2017
  - Module: esnext
  - Path alias: `@/*` → `src/*`

- `next.config.ts` - Next.js configuration
  - SDK packages transpilation: `['@madebykav/ui', '@madebykav/auth', '@madebykav/db', '@madebykav/ai']`

- `drizzle.config.ts` - Database migration configuration
  - Schema path: `src/lib/db/schema.ts`
  - Dialect: PostgreSQL
  - Credentials from `DATABASE_URL` env var

- `tailwind.config.ts` - Tailwind CSS configuration
  - Dark mode: class-based
  - Content paths include SDK UI components in `node_modules/@madebykav/ui`

- `.npmrc` - npm registry configuration
  - GitHub Packages registry for @madebykav scope: `@madebykav:registry=https://npm.pkg.github.com`
  - Requires `GITHUB_TOKEN` for authentication

## Platform Requirements

**Development:**
- Node.js (version not pinned, recommended 18+)
- pnpm package manager
- PostgreSQL 12+ (or compatible platform database)
- GitHub account with personal access token

**Production:**
- Deployment target: MadeByKav Platform
  - Apps run as tenant-isolated instances
  - Authentication via platform session
  - Shared PostgreSQL database with Row-Level Security
  - No additional infrastructure required beyond platform

## Commands

```bash
pnpm dev              # Start Next.js dev server (http://localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm db:generate      # Generate Drizzle migrations from schema
pnpm db:push          # Push schema changes to database (dev only)
```

---

*Stack analysis: 2026-02-18*
