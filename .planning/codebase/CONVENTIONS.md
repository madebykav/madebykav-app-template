# Coding Conventions

**Analysis Date:** 2026-02-18

## Naming Patterns

**Files:**
- Lowercase with hyphens for directories: `src/app/api/example/`
- Extension-based (`.tsx` for React, `.ts` for utilities)
- Route files named `route.ts` for API endpoints (Next.js convention)
- Schema and utility files lowercase: `schema.ts`, `index.ts`

**Functions:**
- Async functions using camelCase: `getAuthContext()`, `requireAuth()`, `withTenant()`
- Export default for React components: `export default async function DashboardPage()`
- Named exports for utilities and helpers: `export const db`, `export const exampleItems`

**Variables:**
- camelCase for variables: `auth`, `items`, `tenantId`, `body`
- UPPERCASE for constants: `DATABASE_URL` (environment variables only)
- Descriptive naming reflecting data type: `items` (array), `item` (single object)

**Types:**
- PascalCase for TypeScript types and interfaces: `ExampleItem`, `NewExampleItem`, `AuthContext`
- `type` keyword used for type aliases: `export type ExampleItem = typeof exampleItems.$inferSelect`
- Generic types from Drizzle inferred: `typeof schema.$inferSelect`

## Code Style

**Formatting:**
- Single quotes for strings: `'next'`, `'@madebykav/auth'`
- Semicolons at end of statements (enforced by Next.js defaults)
- Indentation: 2 spaces (standard Next.js)

**Linting:**
- Tool: `next lint` (ESLint configured through Next.js)
- Run with: `pnpm lint`
- Configuration: Uses Next.js built-in ESLint rules (no explicit `.eslintrc` file in template)

**Tailwind CSS:**
- Utility-first approach: `className="min-h-screen"`, `className="container mx-auto p-8"`
- Conditional classes using `cn()` helper: `cn("base-class", condition && "conditional-class")`
- Dark mode supported via `darkMode: 'class'` in `tailwind.config.ts`

## Import Organization

**Order:**
1. External libraries: `import type { Metadata } from 'next'`
2. SDK packages: `import { getAuthContext } from '@madebykav/auth'`
3. Internal utilities: `import { db } from '@/lib/db'`
4. Relative imports: `import { exampleItems } from '@/lib/db/schema'`
5. CSS imports: `import './globals.css'`

**Path Aliases:**
- `@/*` maps to `./src/*` for absolute imports
- Always use `@/` prefix for imports within `src/`: `import { db } from '@/lib/db'`

**Type Imports:**
- Use `type` keyword for type-only imports to improve tree-shaking
- Example: `import { type NewExampleItem } from '@/lib/db/schema'`

## Error Handling

**Patterns:**
- API routes return structured error responses: `NextResponse.json({ error: 'Title is required' }, { status: 400 })`
- Validation errors include descriptive messages: `'Title is required'`
- Authorization errors use `requireAuth()` which throws 401 automatically
- Form validation checks required fields before database operations

**HTTP Status Codes:**
- 200: Successful GET
- 201: Successful POST/creation
- 400: Bad request (missing required fields)
- 401: Unauthorized (not authenticated)
- 500: Server error (implicit for unhandled exceptions)

## Logging

**Framework:** `console` (native browser/Node.js logging)

**Patterns:**
- Comments used for documentation rather than logs: `// Get authentication context from platform`
- Logging not emphasized in template (error handling via response status codes)
- Debug information provided via comments explaining code flow

## Comments

**When to Comment:**
- Function-level JSDoc for public APIs: `/** Example protected API route demonstrating: */`
- Explaining non-obvious business logic: `// Query with tenant isolation`
- Documentation of critical patterns: RLS, tenant isolation

**JSDoc/TSDoc:**
- Multi-line comment blocks for functions: `/** ... */`
- Describe parameters and behavior
- Used for API routes and exported utilities
- Example from `src/app/api/example/route.ts`:
  ```typescript
  /**
   * Example protected API route demonstrating:
   * 1. Authentication with requireAuth()
   * 2. Tenant-isolated database queries with withTenant()
   * 3. Standard CRUD operations
   */
  ```

## Function Design

**Size:** Functions kept to single responsibility
- API route handlers: GET/POST functions separate
- Database queries wrapped in async IIFE: `await withTenant(db, auth.tenantId, async (tx) => { ... })`

**Parameters:**
- Destructuring for objects: `{ title, description, priority } = body`
- Request body validation before destructuring
- Type annotations for clarity: `async function DashboardPage()`

**Return Values:**
- JSON responses from API routes: `NextResponse.json({ items })`
- React components return JSX
- Database queries return typed data or arrays
- Type inference from Drizzle schema: `items = await withTenant(...)`

## Module Design

**Exports:**
- Default exports for React components: `export default async function DashboardPage()`
- Named exports for utilities: `export const db`, `export { withTenant, withoutRLS } from '@madebykav/db'`
- Type exports: `export type ExampleItem`, `export type NewExampleItem`

**Barrel Files:**
- `src/lib/db/index.ts` re-exports SDK helpers and database connection
- Used to provide single import source for database utilities
- Pattern: `export { withTenant, withoutRLS } from '@madebykav/db'`

## Server vs Client Components

**Server Components (default in Next.js 13+):**
- Use for authentication checks: `const auth = await getAuthContext()`
- Use for database queries: `const items = await withTenant(...)`
- Can handle secrets and env vars safely
- Files in `src/app/` are server components by default

**Client Components:**
- Mark with `'use client'` directive if needed
- Not used in current template (focus on server-side rendering)
- Would be used for interactive UI elements

## Tenant Isolation Conventions

**Critical Pattern - Always Use withTenant():**
```typescript
const items = await withTenant(db, auth.tenantId, async (tx) => {
  return tx.select().from(exampleItems)
})
```

**Always Include tenantId in Inserts:**
```typescript
const newItem: NewExampleItem = {
  tenantId: auth.tenantId,  // REQUIRED
  title,
  description,
  priority: priority ?? 0,
}
return tx.insert(exampleItems).values(newItem).returning()
```

**Table Naming:**
- Prefix tables with app slug: `example_items` (not just `items`)
- Prevents conflicts in shared multi-tenant database
- Pattern: `{app-slug}_{resource-type}`

---

*Convention analysis: 2026-02-18*
