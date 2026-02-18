# Architecture

**Analysis Date:** 2026-02-18

## Pattern Overview

**Overall:** Multi-tenant SaaS application using Next.js with SDK-based architecture

**Key Characteristics:**
- Tenant isolation enforced via Row-Level Security (RLS) at database layer
- Server-first architecture leveraging Next.js App Router with Server Components
- External SDK packages for cross-cutting concerns (auth, database, UI, AI)
- Type-safe database queries with Drizzle ORM
- Headless component model with Tailwind CSS styling

## Layers

**Presentation Layer:**
- Purpose: User interface rendered via Next.js Server Components and client-side React
- Location: `src/app/`
- Contains: Page components (`.tsx`), layouts, API route handlers
- Depends on: Auth SDK, DB SDK, UI SDK, utilities from `src/lib/`
- Used by: Browser clients, mobile API consumers

**Application/Logic Layer:**
- Purpose: Business logic, data coordination, and request handling
- Location: `src/app/` (page components, API routes)
- Contains: Server components that fetch data, form handlers, API endpoint implementations
- Depends on: Database layer, auth context, external APIs
- Used by: Presentation layer, next.js routing

**Data Access Layer:**
- Purpose: Database connection, schema definition, and tenant-isolated queries
- Location: `src/lib/db/`
- Contains: Drizzle ORM configuration, schema definitions, re-exported query utilities
- Depends on: `@madebykav/db` (tenant isolation helpers), PostgreSQL database
- Used by: API routes and server components

**Cross-Cutting Layers:**
- **Authentication:** `@madebykav/auth` SDK - provides `getAuthContext()` and `requireAuth()` helpers
- **Database Tenant Isolation:** `@madebykav/db` SDK - provides `withTenant()` for RLS-enforced queries
- **UI Components:** `@madebykav/ui` SDK - provides Button, Card, Input and styling
- **AI Integration:** `@madebykav/ai` SDK - provides `chat()` for AI interactions

## Data Flow

**Request → Page Render:**

1. User/client requests a page (e.g., `/`)
2. Next.js routes to server component in `src/app/page.tsx`
3. Server component calls `getAuthContext()` to get current tenant/user
4. If tenant context exists, component calls `withTenant(db, tenantId, async (tx) => {...})`
5. Database query executes through transaction with automatic RLS filtering
6. Results returned and rendered to HTML, sent to client

**Request → API Response:**

1. Client calls API endpoint (e.g., `POST /api/example`)
2. Next.js routes to handler in `src/app/api/example/route.ts`
3. Handler calls `requireAuth()` - throws 401 if not authenticated
4. Handler validates request body
5. Handler calls `withTenant(db, auth.tenantId, async (tx) => {...})`
6. Database mutation executes (insert/update/delete) with `tenantId` included
7. JSON response returned to client

**State Management:**

- Authentication state: Provided by `@madebykav/auth` SDK via server-side context
- Data state: Managed in database with automatic tenant filtering via RLS
- UI state: Client-side React state via useState (not used in template, but available)
- Request state: Implicit through Next.js caching and revalidation

## Key Abstractions

**Tenant Isolation Wrapper:**
- Purpose: Ensures all database queries are filtered by tenant without explicit WHERE clauses
- Examples: `src/lib/db/index.ts` re-exports `withTenant()`, used throughout `src/app/page.tsx` and `src/app/api/example/route.ts`
- Pattern: Async function accepting transaction callback - query inside callback automatically filtered by RLS policy

**Authentication Context:**
- Purpose: Provides tenant ID, user ID, and session info to server components and API routes
- Examples: Used in `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/example/route.ts`
- Pattern: `getAuthContext()` returns nullable auth object; `requireAuth()` throws 401 if missing

**Database Schema with RLS:**
- Purpose: Defines table structure with required `tenant_id` column for RLS filtering
- Examples: `src/lib/db/schema.ts` defines `exampleItems` table
- Pattern: Every table has `tenantId: uuid('tenant_id').notNull()` column; RLS policy applied via `tenantRlsPolicy()`

**Component Composition:**
- Purpose: Reusable UI building blocks from SDK
- Examples: `Card`, `Button`, `Input` from `@madebykav/ui`
- Pattern: Imported and composed in server components; styled with Tailwind CSS

## Entry Points

**Web Application Entry:**
- Location: `src/app/layout.tsx`
- Triggers: All page requests
- Responsibilities: Root HTML structure, auth context retrieval, global styling, children layout

**Dashboard Page Entry:**
- Location: `src/app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Authentication check, data fetching (example items), UI rendering with stats and actions

**API Example Entry:**
- Location: `src/app/api/example/route.ts`
- Triggers: GET/POST `/api/example`
- Responsibilities: Protected CRUD operations - GET returns tenant items, POST creates new item with validation

## Error Handling

**Strategy:** Explicit status codes and error responses; authentication-required endpoints throw via `requireAuth()`

**Patterns:**

- **Authentication Errors:** `requireAuth()` throws when no auth context, caught by Next.js and returns 401
- **Validation Errors:** API routes check request payload, return 400 with error message (e.g., missing title in POST)
- **Not Found:** Implicit in `withTenant()` - query returns empty array if no items
- **Server Components:** No explicit error handling shown in template - errors bubble to error boundary (Next.js provides default)

## Cross-Cutting Concerns

**Logging:** Not configured in template. Use `console.log()` or add external logging provider

**Validation:**
- Request body validation in API routes: Check required fields (e.g., `if (!title)`)
- No request validation middleware present - add as needed per endpoint

**Authentication:**
- Server component entry: `getAuthContext()` provides optional auth
- API route entry: `requireAuth()` mandates authentication
- Tenant ID always sourced from auth context - never hardcoded or from request params

**Tenant Isolation:**
- All database queries wrapped with `withTenant()` - automatic RLS filtering
- All inserts include `tenantId: auth.tenantId` - enforced at application level
- RLS policy applied to tables via `tenantRlsPolicy()` - enforced at database level

---

*Architecture analysis: 2026-02-18*
