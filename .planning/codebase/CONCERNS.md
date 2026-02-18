# Codebase Concerns

**Analysis Date:** 2026-02-18

## Missing Test Infrastructure

**Test Framework Absence:**
- Issue: No testing framework configured; zero test files in codebase
- Files: Project-wide - no test files exist in `src/`
- Impact: Cannot verify component behavior, API route correctness, or database interactions. Critical features like tenant isolation (via `withTenant()`) have no automated validation. Risk of regression during refactoring.
- Fix approach: Add Jest or Vitest configuration. Start with unit tests for API routes (`/src/app/api/example/route.ts`), then expand to database operations and auth flows.

**Test Coverage Gaps:**
- What's not tested: All API endpoints, database CRUD operations, tenant isolation, auth context retrieval
- Files: `src/app/api/example/route.ts`, `src/lib/db/`, `src/app/page.tsx`
- Risk: Tenant data isolation could fail undetected; API validation gaps could allow invalid input; page rendering issues only caught in manual testing
- Priority: High - tenant isolation is security-critical

## Insufficient Input Validation

**API Route Input Handling:**
- Issue: `POST /api/example` accepts `request.json()` with minimal validation
- Files: `src/app/api/example/route.ts` (lines 31-39)
- Current mitigation: Only checks `!title`. No validation for `description` (accepts unlimited length), `priority` (accepts any integer), or data type coercion.
- Recommendations:
  - Add schema validation (e.g., Zod) to validate request body shape, types, and constraints
  - Validate string lengths (title max 255 chars, description max 2000)
  - Validate integer ranges (priority 0-10)
  - Reject unknown fields
  - Add try-catch for `request.json()` parsing errors

## RLS Policy Application Gap

**Manual RLS Setup:**
- Issue: Documentation instructs manual RLS policy application via SQL, but this is a separate step from `pnpm db:push`
- Files: `src/lib/db/schema.ts` (lines 33-42), `CLAUDE.md` (RLS section), `README.md` (lines 85-88)
- Impact: If developer forgets to run `SELECT create_tenant_policy('example_items')`, the table has no RLS protection, exposing all tenant data to any user
- Fix approach: Automate RLS policy creation. Either:
  1. Create a post-push migration script that applies RLS automatically
  2. Integrate with Drizzle migrations to run RLS setup as part of schema deployment
  3. Create a `pnpm db:setup` command that handles both schema push and RLS initialization

## Missing Drizzle Migrations Directory

**Schema Management:**
- Issue: No `drizzle/` directory with migration files (ignored in `.gitignore`)
- Files: `.gitignore` (line 38), `drizzle.config.ts`
- Impact: Schema changes are not tracked. Rolling back schema changes or tracking migration history is impossible. Multiple developers can create schema drift.
- Fix approach: Generate and commit initial migrations:
  1. Run `pnpm db:generate` to create migration files
  2. Commit `drizzle/` directory to git
  3. Use migrations for environment consistency

## No Error Handling in API Routes

**Missing Error Boundaries:**
- Issue: API routes lack try-catch for database operations and potential runtime errors
- Files: `src/app/api/example/route.ts` (lines 15-25, 28-54)
- Current state: GET and POST handlers assume success. No handling for:
  - Database connection failures
  - Constraint violations (e.g., duplicate entries)
  - Tenant isolation failures
  - Serialization errors in response
- Risk: Unhandled exceptions return 500 errors with minimal debugging information. Client has no clear error message.
- Improvement path: Add try-catch blocks. Return appropriate status codes (400 for validation, 500 for server errors). Log errors for debugging.

## Unhandled Auth Context Nullability

**Page Component Auth Handling:**
- Issue: `src/app/page.tsx` uses conditional rendering but displays "Please log in" only when `auth.tenantId` is missing
- Files: `src/app/page.tsx` (lines 8, 14-15, 41-45, 53)
- Current state: Shows all dashboard cards even when not authenticated. `auth?.userId` displays "Not authenticated" but component continues rendering data queries.
- Risk: UX confusion - page structure visible before auth check completes. If user is partially authenticated (tenantId missing, userId present), queries fail silently.
- Fix approach: Return early with full-page login redirect or loading state. Use `requireAuth()` (which throws) instead of `getAuthContext()` for components that require authentication.

## Hardcoded Limit in Dashboard Query

**Fixed Query Constraints:**
- Issue: Dashboard query limits results to 5 items
- Files: `src/app/page.tsx` (line 20)
- Impact: Users cannot see more than 5 recent items. No pagination implemented. Stats cards show incomplete data (e.g., "Completed" count only reflects first 5 items).
- Fix approach: Either implement pagination (offset/limit with navigation) or fetch all items and paginate client-side. Consider performance implications if table grows large.

## Button Actions Without Handlers

**Unimplemented Buttons:**
- Issue: Dashboard buttons ("Create Item", "View All", "Settings") have no onClick handlers
- Files: `src/app/page.tsx` (lines 82-84)
- Impact: Buttons appear functional but do nothing. Users click expecting action and nothing happens. No error message or feedback.
- Fix approach: Implement handlers via form actions or client component callbacks. At minimum, add `disabled` attribute or remove until implemented.

## Missing Environment Configuration Validation

**Startup Requirements:**
- Issue: `drizzle.config.ts` and code assume `DATABASE_URL` is set, but no validation at runtime
- Files: `drizzle.config.ts` (line 8), `src/lib/db/index.ts` (line 9)
- Current state: Uses `process.env.DATABASE_URL!` with non-null assertion. If not set, error occurs at runtime, not startup.
- Risk: Deployment might fail with confusing database connection error instead of clear "missing env var" message.
- Fix approach: Add startup validation in `src/lib/db/index.ts` that throws with a clear message if required env vars are missing.

## TypeScript Strict Mode Compliance

**Type Safety:**
- Issue: While `tsconfig.json` has `"strict": true`, some patterns use implicit typing
- Files: `src/app/page.tsx` (line 12 - inline array type), `src/lib/db/index.ts` (line 19 - exports type without usage)
- Current state: Code is type-safe but could be more explicit. Type inference works but doesn't catch all potential issues.
- Fix approach: Consider using `satisfies` operator for better type inference clarity. Review type exports for actual usage.

## Missing Logging Strategy

**Observability Gap:**
- Issue: No logging framework configured; no logging in any source files
- Files: Project-wide
- Impact: Debugging production issues impossible. Database query performance invisible. Auth failures hard to diagnose.
- Fix approach: Add logging library (e.g., `winston`, `pino`, or Vercel's built-in logging). Implement:
  - Database query logging (especially tenant isolation queries)
  - Auth context retrieval logging
  - API request/response logging
  - Error logging with context

## Dependency on "latest" SDK Versions

**Version Pinning:**
- Issue: `package.json` specifies SDK packages as `"latest"` instead of pinned versions
- Files: `package.json` (lines 14-17)
- Impact: Breaking changes in `@madebykav/*` packages could cause unexpected failures. No reproducible builds across environments or time.
- Fix approach: Replace `"latest"` with specific versions (e.g., `"@madebykav/auth": "0.1.0"`). Use exact version pins or `^` range for intentional updates.

## Missing Component Directory Structure

**Component Organization Gap:**
- Issue: `src/components/` directory doesn't exist; comment in layout suggests it should
- Files: `src/app/layout.tsx` (line 24), `README.md` (line 122)
- Impact: Developers creating new components have no established location. Risk of inconsistent component placement or duplication.
- Fix approach: Create `src/components/` directory with subdirectories for organization (e.g., `common/`, `forms/`, `layouts/`). Add a components README with patterns.

## Security: Unvalidated JSON Parsing

**Potential Attack Vector:**
- Issue: `request.json()` in POST endpoint has no size limit or content-type validation
- Files: `src/app/api/example/route.ts` (line 31)
- Risk: Potential for JSON bomb attacks or memory exhaustion. No content-type validation could allow bypassing expected schema.
- Recommendations:
  - Set `bodyParser.json({ limit: '1mb' })` in API configuration
  - Validate `Content-Type: application/json` header before parsing
  - Use schema validation (Zod, Ajv) to reject oversized or malformed payloads

## Database Connection Pool Configuration

**Connection Management:**
- Issue: `postgres` client configured with `prepare: false` but no pool settings
- Files: `src/lib/db/index.ts` (lines 12-14)
- Impact: Under high concurrent load, connection pool might exhaust. No min/max connection limits set. No connection timeout configuration.
- Fix approach: Review and configure `postgres()` client options:
  - Set `max` (max connections) appropriately for workload
  - Set `idle_in_transaction_session_timeout` to prevent stale transactions
  - Consider `max_lifetime` for long-running processes

## Scaling Limits

**Current Capacity:**
- Single example table with no indexes beyond primary key
- No pagination implemented (hardcoded limit of 5 items)
- No caching strategy

**Limit:**
- First page load fetches up to 5 items; scales poorly if table grows to thousands
- Dashboard queries unindexed on filters (none currently, but fragile design)
- No distinction between admin and user queries

**Scaling path:**
- Add database indexes on `tenant_id` and `created_at`
- Implement cursor-based or offset pagination
- Add query-level caching (e.g., React `cache()` or Redis)
- Consider read replicas for reporting queries if needed

---

*Concerns audit: 2026-02-18*
