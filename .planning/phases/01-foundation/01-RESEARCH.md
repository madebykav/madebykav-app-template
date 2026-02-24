# Phase 1: Foundation - Research

**Researched:** 2026-02-25
**Domain:** Dependency management, Drizzle ORM declarative RLS, Tailwind v4 CSS-first config, Next.js standalone output
**Confidence:** HIGH

## Summary

Phase 1 is a spec-driven update that modernizes the app template's dependencies, schema patterns, CSS configuration, and build output. The spec (`APP-TEMPLATE-UPDATE-FINAL.md`) provides exact file contents for every change, making implementation deterministic. The research below documents the technical details the planner needs to create correct, ordered tasks.

The critical path is: update `package.json` dependencies first (drizzle-orm ^0.45.0 must resolve before schema changes compile), then update schema with declarative RLS via `pgPolicy()` + `createTenantPolicy()`, then update CSS/Next config, then clean up unused files and docs.

**Primary recommendation:** Follow the spec file contents verbatim. The only judgment calls are change ordering and verification strategy. Install dependencies first, then make code changes in dependency order.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation decisions are prescribed by the spec document (`APP-TEMPLATE-UPDATE-FINAL.md`). Every file has exact contents defined. Key decisions from the spec:

- **Dependencies:** drizzle-orm ^0.45.0, @madebykav/auth ^0.2.0, @madebykav/db ^0.1.0, @madebykav/ui ^0.1.2. Remove @madebykav/ai entirely.
- **Schema:** Add `pgPolicy()` with `createTenantPolicy()` as third argument to `pgTable()`. Remove manual RLS SQL comments.
- **Tailwind v4:** Add `@source` directive for SDK component scanning in globals.css. Delete `tailwind.config.ts`.
- **Next config:** Add `output: 'standalone'`, remove @madebykav/ai from transpilePackages.
- **DB index:** Remove re-exports of `withTenant` and `withoutRLS` (import directly from @madebykav/db).
- **.env.example:** Updated with dev defaults (DATABASE_URL pointing to localhost:5433) and clear documentation.

### Claude's Discretion
- Order of file changes during implementation
- How to verify each change works (build, type-check, etc.)
- Whether to update pnpm-lock.yaml incrementally or regenerate

### Deferred Ideas (OUT OF SCOPE)
None — discussion was skipped because the spec fully prescribes this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPS-01 | Update drizzle-orm from ^0.38.4 to ^0.45.0 | Current package.json has ^0.38.4. @madebykav/db has peer dep requiring ^0.45.0. Only known breaking change: `.array()` is no longer chainable. Schema does not use `.array()`, so safe. |
| DEPS-02 | Pin @madebykav/auth to ^0.2.0 | Current: `latest` (resolves to 0.1.0). v0.2.0 has breaking AuthContext change: adds `email`, `name`, `role`, `tenantSlug`; removes `appSlug`; `userId` is no longer optional. Spec provides exact new page.tsx with updated field references. |
| DEPS-03 | Pin @madebykav/db to ^0.1.0 | Current: `latest` (resolves to 0.1.0). Pinning prevents accidental breaking upgrades. No code changes needed — same version. |
| DEPS-04 | Pin @madebykav/ui to ^0.1.2 | Current: `latest` (resolves to 0.1.0). Pinning to ^0.1.2 may pull a newer minor. No breaking changes expected. |
| DEPS-05 | Remove @madebykav/ai from dependencies | Current: `"@madebykav/ai": "latest"` in dependencies. No imports of `@madebykav/ai` exist in src/. Safe removal. |
| DEPS-06 | Add `output: 'standalone'` to next.config.ts | Required for Docker builds. Creates `.next/standalone` folder with self-contained server. Harmless for non-Docker dev. |
| DEPS-07 | Remove @madebykav/ai from transpilePackages | Current next.config.ts includes it. Must be removed alongside dependency removal. |
| SCHM-01 | Add pgPolicy() declarative RLS to schema.ts | `pgPolicy` imported from `drizzle-orm/pg-core`. `createTenantPolicy()` from `@madebykav/db` returns policy config object. Third arg of `pgTable()` is an array of policies. Spec provides exact code. |
| SCHM-02 | Remove SDK re-exports from db/index.ts | Current `db/index.ts` has `export { withTenant, withoutRLS } from '@madebykav/db'`. These re-exports are unused — app code already imports directly from `@madebykav/db`. Safe removal. |
| SCHM-03 | Update all withTenant imports to use @madebykav/db | Already done in current codebase: `page.tsx` and `route.ts` both import from `@madebykav/db`. No changes needed beyond SCHM-02. |
| APP-04 | Add @source directive to globals.css | `@source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}"` tells Tailwind v4 to scan SDK for utility classes. Without this, SDK component classes are missing from output. |
| APP-05 | Delete tailwind.config.ts | Tailwind v4 uses CSS-first config. The `content` array in tailwind.config.ts is replaced by `@source` in globals.css. The `darkMode: 'class'` setting is the default in v4. |
| DOCS-01 | Update .env.example | Spec provides exact contents: DATABASE_URL with localhost:5433 default, GITHUB_TOKEN guidance, PLATFORM_URL, and app identity vars. |
</phase_requirements>

## Standard Stack

### Core
| Library | Current | Target | Purpose | Why This Version |
|---------|---------|--------|---------|------------------|
| drizzle-orm | ^0.38.4 | ^0.45.0 | ORM with declarative schema | Required by @madebykav/db peer dependency; pgPolicy() support stable since 0.36.0 |
| drizzle-kit | ^0.30.4 | ^0.30.4 (unchanged) | Schema push/migration tool | Compatible with drizzle-orm 0.45; has known RLS push bug (see Pitfalls) |
| @madebykav/auth | latest (0.1.0) | ^0.2.0 | Platform auth context | Breaking change: new AuthContext shape with more fields |
| @madebykav/db | latest (0.1.0) | ^0.1.0 | RLS tenant isolation | Pinned; exports createTenantPolicy() for declarative RLS |
| @madebykav/ui | latest (0.1.0) | ^0.1.2 | Shared UI components | Pinned; minor version bump |
| tailwindcss | ^4.0.6 | ^4.0.6 (unchanged) | CSS framework | Already v4; just needs config migration (delete JS, add @source) |
| next | ^15.1.6 | ^15.1.6 (unchanged) | React framework | Adding standalone output config only |

### Not Changed
| Library | Version | Notes |
|---------|---------|-------|
| react / react-dom | ^19.0.0 | No changes |
| postgres | ^3.4.5 | No changes |
| typescript | ^5.7.3 | No changes |
| @types/* | Various | No changes |

### Removed
| Library | Reason |
|---------|--------|
| @madebykav/ai | Optional, not every app needs it. Zero imports in src/. |

**Installation:**
After updating package.json, run:
```bash
pnpm install
```
This will regenerate `pnpm-lock.yaml` with the new version constraints.

## Architecture Patterns

### Pattern 1: Declarative RLS via pgPolicy()
**What:** RLS policies defined inline in the schema file as the third argument to `pgTable()`, replacing manual SQL execution.
**When to use:** Every table with tenant-scoped data.
**Source:** @madebykav/db v0.1.0 `createTenantPolicy()` + drizzle-orm `pgPolicy()` from `drizzle-orm/pg-core`

```typescript
// Source: APP-TEMPLATE-UPDATE-FINAL.md §5 + @madebykav/db dist/index.d.ts
import { pgTable, pgPolicy, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { createTenantPolicy } from '@madebykav/db'

export const exampleItems = pgTable('example_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: text('title').notNull(),
  // ...columns
}, (table) => [
  pgPolicy('example_items_tenant_isolation', createTenantPolicy()),
])
```

**How `createTenantPolicy()` works internally:**
```typescript
// Returns this config object:
{
  as: 'permissive',
  for: 'all',
  to: 'public',
  using: sql`tenant_id = current_setting('app.current_tenant_id', true)::uuid`,
  withCheck: sql`tenant_id = current_setting('app.current_tenant_id', true)::uuid`,
}
```

### Pattern 2: Tailwind v4 CSS-First Configuration
**What:** Content scanning configured via `@source` directives in CSS instead of `content` array in `tailwind.config.ts`.
**When to use:** Any project using Tailwind v4 with external component libraries.

```css
/* Source: Tailwind CSS v4 docs - detecting classes in source files */
@import "tailwindcss";
@import "@madebykav/ui/globals.css";

@source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}";

@theme inline {
  /* App-specific overrides */
}
```

**Key facts:**
- `@source` paths are relative to the CSS file location
- `node_modules` is excluded from scanning by default; `@source` overrides this for specified paths
- `@import "tailwindcss"` replaces the old `@tailwind base/components/utilities` directives
- `darkMode: 'class'` is the default in v4 (no config needed)

### Pattern 3: Next.js Standalone Output
**What:** `output: 'standalone'` in next.config.ts creates a self-contained deployment folder.
**When to use:** Docker/container deployments.

```typescript
// Source: Next.js docs - output configuration
const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@madebykav/ui', '@madebykav/auth', '@madebykav/db'],
}
```

**Key facts:**
- Creates `.next/standalone/` with minimal `server.js`
- Copies only required `node_modules` files
- Harmless in non-Docker dev environments
- Required for the Dockerfile in later phases

### Anti-Patterns to Avoid
- **Re-exporting SDK functions through local modules:** The current `db/index.ts` re-exports `withTenant` and `withoutRLS`. This obscures the actual import source and makes it unclear whether the function comes from the app or the SDK. Import directly from `@madebykav/db`.
- **Manual RLS SQL comments in schema:** The old pattern had comments telling developers to run `SELECT create_tenant_policy(...)` after schema push. Declarative `pgPolicy()` makes this automatic.
- **Keeping tailwind.config.ts with Tailwind v4:** The JS config is for v3. In v4, it may cause conflicts or confusion. Delete it and use CSS-first configuration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RLS policy SQL | Manual `sql` template strings for USING/WITH CHECK | `createTenantPolicy()` from `@madebykav/db` | Handles the `current_setting('app.current_tenant_id', true)::uuid` expression correctly; tested and type-safe |
| Content scanning for UI lib | Custom postcss plugin or manual safelist | `@source` directive in CSS | Built into Tailwind v4; understands globs and file heuristics |
| Auth context types | Manual TypeScript interface for header parsing | `@madebykav/auth` v0.2.0 `AuthContext` type | SDK handles header reading, cookie fallback, and type safety |

**Key insight:** This phase is about adopting patterns that already exist in the SDK and framework. The spec's file contents are the "standard" — no custom solutions needed.

## Common Pitfalls

### Pitfall 1: drizzle-kit push creates empty RLS USING clauses
**What goes wrong:** `drizzle-kit push` may create RLS policies without the `USING` and `WITH CHECK` SQL clauses, resulting in policies that block all access.
**Why it happens:** Known bug in drizzle-kit (Issue #3504, marked as fixed in beta). The `push` command handles policy SQL differently from `generate` + `migrate`.
**How to avoid:** After `pnpm db:push`, verify the policy was created correctly:
```sql
SELECT polname, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'example_items'::regclass;
```
If `polqual` is NULL, the policy is empty. Workaround: use `pnpm db:generate` + `drizzle-kit migrate` instead of `push`.
**Warning signs:** All RLS-filtered queries return zero rows even when data exists.
**Confidence:** HIGH — verified via GitHub issue #3504 (closed/fixed in beta). Status with drizzle-kit 0.30.4 is uncertain; the prior decisions note this as a known concern.

### Pitfall 2: @madebykav/auth v0.2.0 AuthContext breaking change
**What goes wrong:** Code that uses `auth?.tenantId`, `auth?.userId`, `auth?.appSlug` breaks because the AuthContext shape changed.
**Why it happens:** v0.2.0 AuthContext has different fields: adds `email`, `name`, `role`, `tenantSlug`; removes `appSlug`; `userId` is now required (not optional). `getAuthContext()` returns `null` instead of an object with null fields.
**How to avoid:** Use the exact file contents from the spec. Key change: `if (!auth)` instead of `if (!auth?.tenantId)`.
**Warning signs:** TypeScript errors about missing properties on AuthContext.
**Confidence:** HIGH — verified by reading @madebykav/auth v0.1.0 type definitions vs spec's v0.2.0 interface.

### Pitfall 3: Missing @source directive causes invisible UI classes
**What goes wrong:** SDK component classes (from `@madebykav/ui`) don't appear in the CSS output, making components unstyled.
**Why it happens:** Tailwind v4 ignores `node_modules` by default. Without `@source`, the SDK's class usage is never scanned.
**How to avoid:** Add `@source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}"` to `globals.css`.
**Warning signs:** Buttons, cards, and other UI components render with no styling.
**Confidence:** HIGH — verified by Tailwind v4 official docs on detecting classes in source files.

### Pitfall 4: Forgetting to remove @madebykav/ai from transpilePackages
**What goes wrong:** Build may warn or error about a missing package in transpilePackages that's no longer in dependencies.
**Why it happens:** Removing from `package.json` but forgetting `next.config.ts`.
**How to avoid:** Update both files together.
**Warning signs:** Build warnings about unresolvable transpile target.
**Confidence:** MEDIUM — behavior depends on Next.js version handling of missing transpile targets.

### Pitfall 5: pnpm install fails without GITHUB_TOKEN
**What goes wrong:** `pnpm install` cannot resolve `@madebykav/*` packages from the GitHub npm registry.
**Why it happens:** The `.npmrc` points to `npm.pkg.github.com` which requires authentication.
**How to avoid:** Ensure `~/.npmrc` has `//npm.pkg.github.com/:_authToken=<token>` or `GITHUB_TOKEN` env var is set.
**Warning signs:** 401/403 errors during `pnpm install`.
**Confidence:** HIGH — standard GitHub Packages behavior.

## Code Examples

### Current vs Target: schema.ts

**Current (manual RLS):**
```typescript
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { tenantRlsPolicy } from '@madebykav/db'

export const exampleItems = pgTable('example_items', {
  // ...columns
})
// Developer must manually run: SELECT create_tenant_policy('example_items');
```

**Target (declarative RLS):**
```typescript
import { pgTable, pgPolicy, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { createTenantPolicy } from '@madebykav/db'

export const exampleItems = pgTable('example_items', {
  // ...columns
}, (table) => [
  pgPolicy('example_items_tenant_isolation', createTenantPolicy()),
])
```

### Current vs Target: db/index.ts

**Current:**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
export { withTenant, withoutRLS } from '@madebykav/db'  // REMOVE THIS

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })
export type Database = typeof db
```

**Target:**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
export type Database = typeof db
```

### Current vs Target: globals.css

**Current (missing @source):**
```css
@import "tailwindcss";
@import "@madebykav/ui/globals.css";

@theme inline { /* ... */ }
body { @apply bg-background text-foreground antialiased; }
```

**Target (with @source):**
```css
@import "tailwindcss";
@import "@madebykav/ui/globals.css";

@source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}";

@theme inline { /* ... */ }
body { @apply bg-background text-foreground antialiased; }
```

### Current vs Target: next.config.ts

**Current:**
```typescript
const nextConfig: NextConfig = {
  transpilePackages: ['@madebykav/ui', '@madebykav/auth', '@madebykav/db', '@madebykav/ai'],
}
```

**Target:**
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@madebykav/ui', '@madebykav/auth', '@madebykav/db'],
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual RLS via `SELECT create_tenant_policy()` SQL | Declarative `pgPolicy()` in schema | drizzle-orm 0.36.0 (2024) | RLS policies are version-controlled with schema |
| `tailwind.config.ts` with `content` array | `@source` directive in CSS | Tailwind v4.0 (Jan 2025) | No JS config file needed; CSS-first |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4.0 (Jan 2025) | Already done in current codebase |
| `@madebykav/auth` returns `{ tenantId, userId, appSlug }` | Returns `{ tenantId, userId, email, name, role, tenantSlug }` or null | @madebykav/auth v0.2.0 | More fields, null-based auth check, no appSlug |

**Deprecated/outdated:**
- `tenantRlsPolicy` import from `@madebykav/db`: Still exported but replaced by `createTenantPolicy()` helper for declarative usage
- `tailwind.config.ts`: Tailwind v4 uses CSS-first configuration; JS config is v3 legacy
- Optional chaining on AuthContext (`auth?.tenantId`): v0.2.0 returns null, not an object with optional fields

## Verification Strategy (Claude's Discretion)

### Recommended Order of Changes
1. **package.json** — Update all dependency versions, remove @madebykav/ai
2. **pnpm install** — Regenerate lockfile with new versions
3. **next.config.ts** — Add `output: 'standalone'`, remove @madebykav/ai from transpilePackages
4. **src/lib/db/schema.ts** — Add pgPolicy() with createTenantPolicy()
5. **src/lib/db/index.ts** — Remove re-exports
6. **src/app/globals.css** — Add @source directive
7. **Delete tailwind.config.ts** — Remove legacy JS config
8. **.env.example** — Update with dev defaults

### Verification Approach
- After step 2: `pnpm install` succeeds without errors
- After step 7: `pnpm build` should succeed (validates TypeScript + Tailwind compilation)
- Alternatively: Run `npx tsc --noEmit` after code changes for faster type-checking without full build

### Lock File Strategy
Regenerate `pnpm-lock.yaml` by running `pnpm install` after updating `package.json`. Do NOT manually edit the lock file.

## Open Questions

1. **drizzle-kit push RLS bug status with version 0.30.4**
   - What we know: Issue #3504 was marked fixed in beta. The current template uses drizzle-kit ^0.30.4.
   - What's unclear: Whether 0.30.4 includes the fix or if it requires a newer version.
   - Recommendation: Note this as a known risk. If `db:push` creates empty policies, use `db:generate` + `migrate` workflow instead. This is a dev-time concern, not a blocking issue for Phase 1 (Phase 1 scope is code changes, not database setup).

2. **@madebykav/auth v0.2.0 availability**
   - What we know: The spec prescribes ^0.2.0 but the currently installed version is 0.1.0.
   - What's unclear: Whether v0.2.0 is published to the GitHub npm registry yet.
   - Recommendation: `pnpm install` will fail if v0.2.0 is not published. If it fails, this becomes a blocker requiring the auth SDK to be published first.

3. **@madebykav/ui v0.1.2 availability**
   - What we know: Current installed version is 0.1.0, spec requires ^0.1.2.
   - What's unclear: Whether 0.1.2 is published.
   - Recommendation: Same as above — `pnpm install` will surface this.

## Sources

### Primary (HIGH confidence)
- `APP-TEMPLATE-UPDATE-FINAL.md` — Complete spec with exact file contents for every change
- `@madebykav/db` v0.1.0 `dist/index.d.ts` — Verified `createTenantPolicy()` return type and `withTenant` signature
- `@madebykav/auth` v0.1.0 `dist/index.d.ts` — Verified current AuthContext type (to understand breaking change scope)
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) — pgPolicy API, import paths, third-arg array syntax
- [Tailwind CSS v4 - Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files) — @source directive syntax, node_modules handling
- [Next.js output config](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) — standalone output behavior

### Secondary (MEDIUM confidence)
- [Drizzle ORM Issue #3504](https://github.com/drizzle-team/drizzle-orm/issues/3504) — RLS push bug, closed/fixed in beta
- [Tailwind CSS v4 announcement](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config migration
- [Tailwind CSS upgrade guide](https://tailwindcss.com/docs/upgrade-guide) — v3 to v4 migration steps
- [Next.js transpilePackages docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) — Package transpilation configuration

### Tertiary (LOW confidence)
- Drizzle-orm 0.38 to 0.45 breaking changes — Could not find comprehensive changelog. Only confirmed: `.array()` is no longer chainable (not relevant to this schema).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Exact versions specified by spec, verified against installed packages
- Architecture: HIGH — pgPolicy API verified in drizzle docs and @madebykav/db source; Tailwind @source verified in official docs
- Pitfalls: HIGH — drizzle-kit push bug verified via GitHub issue; auth breaking change verified by comparing type definitions; @source necessity verified in Tailwind docs

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable — spec is fixed, no moving targets)
