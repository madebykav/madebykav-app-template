# External Integrations

**Analysis Date:** 2026-02-18

## APIs & External Services

**Platform Services:**
- MadeByKav Platform - Primary integration target
  - SDK: `@madebykav/auth`, `@madebykav/db`, `@madebykav/ui`, `@madebykav/ai`
  - Auth: Handled by platform session via cookies
  - API Endpoint: Configured via `PLATFORM_URL` env var

**AI Services:**
- OpenAI API - ChatGPT models via @madebykav/ai wrapper
  - SDK/Client: `@madebykav/ai` package
  - Models: gpt-4o-mini (default), gpt-4o (optional)
  - Usage tracking: Available via `getUsage()` function

## Data Storage

**Databases:**
- PostgreSQL (platform-managed)
  - Connection: `DATABASE_URL` env var
  - Client: `postgres` npm package
  - ORM: Drizzle ORM 0.38.4
  - Schema location: `src/lib/db/schema.ts`
  - Row-Level Security: Enforced by @madebykav/db
  - Multi-tenancy: Tenant isolation via RLS policies applied per table

**File Storage:**
- Not configured - Local filesystem only (or platform-provided)

**Caching:**
- None - Relies on Next.js request cache and database query results

## Authentication & Identity

**Auth Provider:**
- MadeByKav Platform (custom)
  - Implementation: Cookie-based session passed to SDK
  - Functions:
    - `getAuthContext()` - Get auth in Server Components (never throws)
    - `requireAuth()` - Get auth in API Routes (throws 401 if unauthenticated)
  - Returns: `{ tenantId, userId, user, session, appSlug }`
  - Scope: Tenant isolation via `tenantId` in all queries

**Session Management:**
- Automatic via platform
- No manual login/logout - Handled by platform portal
- Session cookie validated by SDK packages

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging (standard Node.js console methods)
- No structured logging configured

## CI/CD & Deployment

**Hosting:**
- MadeByKav Platform (proprietary)
  - Deployment mechanism: TBD (platform-specific)
  - Environment isolation: Tenant-based

**CI Pipeline:**
- Not detected - No GitHub Actions or CI configuration found

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@host:5432/database?sslmode=require`
  - Source: Platform admin or database provider (Neon)

- `GITHUB_TOKEN` - GitHub personal access token
  - Scope: `read:packages` only
  - Purpose: Authenticate npm install of @madebykav SDK packages
  - Created at: https://github.com/settings/tokens

- `PLATFORM_URL` - MadeByKav platform URL
  - Default: `https://madebykav.com` (production)
  - Override for: Local development (`http://localhost:3000`)

**Optional env vars:**
- `NEXT_PUBLIC_APP_NAME` - App display name (public, safe to expose)
- `NEXT_PUBLIC_APP_SLUG` - App identifier for URLs (public, safe to expose)

**Secrets location:**
- `.env.local` - Local development (not committed, in .gitignore)
- Platform secrets manager for production (TBD)

## Webhooks & Callbacks

**Incoming:**
- None detected - App responds only to HTTP requests from users

**Outgoing:**
- None detected - App makes no external webhook calls

## Package Repository

**npm Registry:**
- GitHub Packages (for @madebykav scope)
  - Registry: `https://npm.pkg.github.com`
  - Authentication: Via `.npmrc` with `GITHUB_TOKEN`
  - Setup: `echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> ~/.npmrc`

## SDK Package Details

**@madebykav/auth:**
- Purpose: Session and tenant context management
- Entry: `import { getAuthContext, requireAuth } from '@madebykav/auth'`
- Used in: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/example/route.ts`

**@madebykav/db:**
- Purpose: Database connection and tenant isolation
- Entry: `import { withTenant, withoutRLS, tenantRlsPolicy } from '@madebykav/db'`
- Used in: `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `src/app/page.tsx`, `src/app/api/example/route.ts`
- Database: Drizzle ORM + postgres client (configured in `src/lib/db/index.ts`)

**@madebykav/ui:**
- Purpose: Shared component library
- Entry: `import { Button, Card, Input, cn } from '@madebykav/ui'`
- Styles: Global CSS imported in `src/app/globals.css`
- Tailwind: Content config includes UI package in `tailwind.config.ts`
- Used in: `src/app/page.tsx`

**@madebykav/ai:**
- Purpose: AI chat interface
- Entry: `import { chat, getUsage } from '@madebykav/ai'`
- Configuration: `PLATFORM_URL` env var or production default
- Not used in template (available for extension)

---

*Integration audit: 2026-02-18*
