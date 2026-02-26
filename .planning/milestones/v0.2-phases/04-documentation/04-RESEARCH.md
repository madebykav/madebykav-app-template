# Phase 4: Documentation - Research

**Researched:** 2026-02-25
**Domain:** Technical documentation (CLAUDE.md, README.md, SDK component spec)
**Confidence:** HIGH

## Summary

Phase 4 is a documentation-only phase. All code changes have been completed in Phases 1-3, so the task is to accurately reflect the current v2 template state in two documentation files (CLAUDE.md and README.md) and produce a standalone Sonner/Toast specification brief for the platform UI SDK team.

The existing CLAUDE.md and README.md are heavily outdated -- they reference the v1 API patterns (AuthContext with nullable fields instead of null return, `tenantRlsPolicy()` instead of declarative `pgPolicy()`, `@madebykav/ai` as a default dependency, no Docker or health probe information). Both files need full rewrites, not incremental edits.

The spec document (APP-TEMPLATE-UPDATE-FINAL.md) provides comprehensive guidance for both rewrites, including exact section outlines, code examples, and architectural context. The Sonner/Toast brief uses UI-COMPONENT-GAPS.md as its starting point and needs light augmentation with Sonner API details.

**Primary recommendation:** Follow the APP-TEMPLATE-UPDATE-FINAL.md spec sections "CLAUDE.md Rewrite" and "README.md Rewrite" as the authoritative source for content, supplemented by actual file contents from the codebase for accuracy verification.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCS-02 | Rewrite CLAUDE.md with updated SDK docs (AuthContext v0.2.0), patterns, architecture context, commands, and things to avoid | Spec provides exact section content; codebase analysis confirms all v2 patterns are in place; delta analysis below identifies every stale section in current CLAUDE.md |
| DOCS-03 | Rewrite README.md with quick start, deployment (Docker + Vercel), project structure, and SDK table | Spec provides exact section content; current README.md is completely v1 (no Docker, no dev.sh, no health probes, wrong SDK table, wrong RLS instructions) |
| DOCS-04 | Generate Sonner/Toast brief for platform dev (@madebykav/ui SDK addition request) | UI-COMPONENT-GAPS.md provides wrapper code and rationale; Sonner API docs provide complete Toaster props and toast() variants for the spec |
</phase_requirements>

## Standard Stack

### Core

This phase creates/modifies only Markdown files. No libraries to install.

| File | Action | Purpose |
|------|--------|---------|
| `CLAUDE.md` | Full rewrite | AI development context for Claude Code and other LLM assistants |
| `README.md` | Full rewrite | Developer-facing project documentation |
| New spec file (e.g., `docs/sonner-toast-brief.md`) | Create | SDK addition request for platform team |

### Source Material

| Source | Location | What It Provides |
|--------|----------|-----------------|
| APP-TEMPLATE-UPDATE-FINAL.md | Repo root | Authoritative spec with exact CLAUDE.md and README.md section content |
| UI-COMPONENT-GAPS.md | Repo root | Sonner/Toast wrapper code and component gap analysis |
| Actual source files | `src/` | Ground truth for code examples and patterns |
| Prior phase decisions | `.planning/STATE.md` | All accumulated architectural decisions |

## Architecture Patterns

### Pattern 1: CLAUDE.md Structure (AI Context Document)

**What:** A single file that gives an AI assistant everything it needs to work effectively in the codebase.
**Key sections (from spec):**
1. Project Overview (architecture context -- proxy auth, app-owned DB, RLS)
2. Folder Structure (updated tree with health probes, actions, globals.css)
3. SDK Packages (auth v0.2.0, db v0.1.0, ui v0.1.2 -- with correct types and imports)
4. Common Patterns (server component, API route, server action -- all using v0.2.0 patterns)
5. Commands (including Docker and db commands)
6. Environment Variables
7. Things to Avoid (6 items including "never call getAuthContext in root layout")
8. Debugging
9. Advanced: Backend Proxy Pattern (optional advanced section from spec)

**Critical v2 changes that MUST be reflected:**
- AuthContext returns `null` (not `{ tenantId: null, userId: null, ... }`)
- Null check pattern: `if (!auth) return` (not `if (!auth.tenantId)`)
- AuthContext fields: `tenantId`, `userId`, `email`, `name`, `role`, `tenantSlug` (no `session`, no `user` sub-object)
- `withTenant` imported from `@madebykav/db` directly (not re-exported from `@/lib/db`)
- `createTenantPolicy()` for declarative RLS via `pgPolicy()` (not `tenantRlsPolicy()` manual SQL)
- `@madebykav/ai` removed from default dependencies
- Table names don't need app-slug prefixes (each app owns its own DB)
- `isStandaloneMode()` export from `@madebykav/auth`
- `cn()` imported from `@madebykav/ui/lib/utils`
- Docker commands: `docker build -t app .`
- Health probe endpoints documented
- Root layout is synchronous (no auth call)

### Pattern 2: README.md Structure (Developer Documentation)

**What:** Quick-start focused documentation for developers cloning the template.
**Key sections (from spec):**
1. Quick Start (clone, configure npmrc, copy .env, install, `./dev.sh`)
2. Deployment (Vercel and Docker paths)
3. Project Structure (full tree including health probes, actions)
4. SDK Packages (table with 4 packages, @madebykav/ai listed as optional add-on)
5. Commands (table format with Docker build included)
6. Tenant Isolation (brief explanation with code example)
7. AI Development (reference to CLAUDE.md)

### Pattern 3: SDK Component Brief (Spec Document)

**What:** A self-contained specification for the platform SDK team to add Sonner toast support to @madebykav/ui.
**Key sections:**
1. Component requested: Toaster + toast
2. Why platform-wide (not app-specific)
3. Recommended implementation (wrapper code from UI-COMPONENT-GAPS.md)
4. Sonner API surface to expose (Toaster props, toast() variants)
5. Integration pattern (where to place `<Toaster />` in layout)
6. Dependency: `sonner` as dependency of @madebykav/ui (not peer dep)

### Anti-Patterns to Avoid

- **Stale code examples:** Never copy-paste from the current CLAUDE.md. Always reference actual source files or the spec.
- **v1 patterns in v2 docs:** `auth?.tenantId`, `tenantRlsPolicy()`, `import { withTenant } from '@/lib/db'`, `@madebykav/ai` examples.
- **Incomplete Docker docs:** Must include BuildKit secret mount, health probes, dev.sh, docker-compose.
- **Wrong auth shape:** The AuthContext interface has specific fields (not `user` sub-object, not `session`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLAUDE.md content | Write from scratch | Follow spec section "CLAUDE.md Rewrite" | Spec has been reviewed and approved; deviating risks inconsistency |
| README.md content | Write from scratch | Follow spec section "README.md Rewrite" | Same as above |
| Sonner API docs | Research from scratch | Use official Sonner docs + shadcn/ui pattern | Already well-documented, community-standard pattern |

## Common Pitfalls

### Pitfall 1: Documenting Spec Instead of Reality

**What goes wrong:** Docs reference code patterns from the spec that differ slightly from actual implementation (e.g., the spec Dockerfile uses `node:20-alpine` but actual uses `node:22-alpine`; spec CI/CD uses `build-push-action@v5` but actual uses `@v6`).
**Why it happens:** Blindly copying spec content without checking against actual files.
**How to avoid:** For every code example in the docs, verify against actual source files. The spec is guidance; the codebase is ground truth.
**Warning signs:** Dockerfile base image mismatch, CI/CD action version mismatch, missing `satisfies` pattern in API route example.

### Pitfall 2: Leaving v1 Vestiges

**What goes wrong:** Some v1 patterns survive in the rewrite (e.g., `auth.session`, `tenantRlsPolicy()`, `@madebykav/ai` in SDK table).
**Why it happens:** Old CLAUDE.md content bleeds into the rewrite.
**How to avoid:** Start each file from blank, following spec outline, filling in from actual source files.
**Warning signs:** Any reference to `tenantRlsPolicy`, `auth.session`, `auth.user`, `@madebykav/ai` as required dep, `tailwind.config.ts`.

### Pitfall 3: Incorrect AuthContext Shape

**What goes wrong:** Documenting AuthContext with wrong fields or wrong null behavior.
**Why it happens:** v0.2.0 is a breaking change from v0.1.x; easy to mix up.
**How to avoid:** Use the exact interface from the spec:
```typescript
interface AuthContext {
  tenantId: string;      // UUID
  userId: string;        // UUID
  email: string;
  name: string;
  role: string;          // 'platform_admin' | 'tenant_admin' | 'tenant_user'
  tenantSlug: string;
}
```
`getAuthContext()` returns `AuthContext | null`. `requireAuth()` returns `AuthContext` (throws 401).

### Pitfall 4: Missing Docker BuildKit Context

**What goes wrong:** Docker build instructions don't mention BuildKit secrets for GITHUB_TOKEN.
**Why it happens:** Forgetting that the Dockerfile uses `--mount=type=secret,id=GITHUB_TOKEN`.
**How to avoid:** Docker build command must be:
```bash
docker build --secret id=GITHUB_TOKEN,env=GITHUB_TOKEN -t app .
```
Not just `docker build -t app .` (which the spec simplifies but will fail without the secret).

### Pitfall 5: Sonner Brief Too Vague

**What goes wrong:** Toast brief is just "add sonner" without enough detail for platform dev to implement.
**Why it happens:** Treating DOCS-04 as low priority.
**How to avoid:** Include wrapper code, Toaster props to expose, toast() API surface, CSS variable integration, and recommended export surface.

## Code Examples

### CLAUDE.md - AuthContext v0.2.0 (verified from actual page.tsx)

```typescript
// Source: src/app/page.tsx (actual implementation)
const auth = await getAuthContext()

if (!auth) {
  return (/* unauthenticated UI */)
}

// auth is now AuthContext (non-null), fields:
// auth.tenantId, auth.userId, auth.email, auth.name, auth.role, auth.tenantSlug
```

### CLAUDE.md - Declarative RLS (verified from actual schema.ts)

```typescript
// Source: src/lib/db/schema.ts (actual implementation)
import { pgTable, pgPolicy, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { createTenantPolicy } from '@madebykav/db'

export const exampleItems = pgTable('example_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: text('title').notNull(),
  // ...
}, (table) => [
  pgPolicy('example_items_tenant_isolation', createTenantPolicy()),
])
```

### CLAUDE.md - API Route with satisfies (verified from actual route.ts)

```typescript
// Source: src/app/api/example/route.ts (actual implementation)
const [item] = await withTenant(db, auth.tenantId, async (tx) => {
  return tx.insert(exampleItems).values({
    tenantId: auth.tenantId,
    title,
    description,
    priority: priority ?? 0,
  } satisfies NewExampleItem).returning()
})
```

### CLAUDE.md - Health Probes (verified from actual routes)

```typescript
// Source: src/app/api/health/route.ts - Liveness (no DB check)
export async function GET() {
  return Response.json({ status: 'ok' })
}

// Source: src/app/api/health/ready/route.ts - Readiness (DB check)
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ready' })
  } catch {
    return Response.json({ status: 'not ready' }, { status: 503 })
  }
}
```

### Sonner/Toast Wrapper (from UI-COMPONENT-GAPS.md)

```tsx
"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={{
        "--normal-bg": "var(--color-background)",
        "--normal-text": "var(--color-foreground)",
        "--normal-border": "var(--color-border)",
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
```

## State of the Art

### Delta: Current CLAUDE.md vs Required v2 State

| Section | Current (v1) | Required (v2) | Impact |
|---------|-------------|---------------|--------|
| Auth SDK | Returns `{ tenantId, userId, user, session }` with nulls | Returns `AuthContext \| null` with `{ tenantId, userId, email, name, role, tenantSlug }` | **BREAKING** - all auth examples wrong |
| Auth null check | `if (!auth.tenantId)` | `if (!auth)` | **BREAKING** - guard pattern changed |
| DB imports | `import { withTenant, withoutRLS, tenantRlsPolicy } from '@madebykav/db'` | `import { withTenant, withoutRLS, createTenantPolicy } from '@madebykav/db'` | `tenantRlsPolicy` removed |
| RLS pattern | Manual SQL: `db.execute(tenantRlsPolicy('table'))` | Declarative: `pgPolicy('name', createTenantPolicy())` in schema | Fundamentally different approach |
| Table naming | App-slug prefix: `myapp_items` | Clean names: `items` (each app owns its DB) | Naming convention changed |
| AI SDK | `@madebykav/ai` documented as core package | Removed - optional, add when needed | Remove entire section |
| Docker | Not documented | Dockerfile, docker-compose, dev.sh, health probes | Entirely new section |
| Layout | "Root layout with auth context" | Synchronous layout, no auth call | Critical v2 change |
| UI imports | `import { cn } from '@madebykav/ui'` | `import { cn } from '@madebykav/ui/lib/utils'` | Import path changed |
| Folder structure | Missing health probes, actions | Full tree with all v2 files | Outdated |
| Commands | No Docker commands | Includes `docker build`, `./dev.sh` | Missing |
| Things to avoid | 5 items | 6 items (adds "never call getAuthContext in root layout", "never validate sessions") | Missing critical items |

### Delta: Current README.md vs Required v2 State

| Section | Current (v1) | Required (v2) | Impact |
|---------|-------------|---------------|--------|
| Quick Start | Manual 5-step (no dev.sh, no Docker) | `./dev.sh` one-command setup | Completely different flow |
| Deployment | Not documented | Docker + Vercel sections | Missing |
| DB setup | Manual `pnpm db:push` + manual RLS SQL | `./dev.sh` handles everything; RLS is declarative | Outdated |
| SDK table | Lists `@madebykav/ai` as core | 3 core + ai as optional | Wrong |
| Project structure | Missing health probes, actions, globals.css notes | Full v2 tree | Outdated |
| RLS example | `import { withTenant } from '@madebykav/db'` (correct) but manual SQL policy | Declarative pgPolicy | Partially outdated |
| Add AI section | Full code example | Remove or mark as optional add-on | Misleading |

## Spec vs Reality Discrepancies

Discrepancies between APP-TEMPLATE-UPDATE-FINAL.md and the actual codebase that the planner must resolve:

| Spec Says | Actual Codebase | Resolution for Docs |
|-----------|----------------|---------------------|
| `Dockerfile`: `FROM node:20-alpine` | `FROM node:22-alpine` | Use actual: `node:22-alpine` |
| `Dockerfile`: `RUN corepack enable && corepack prepare pnpm@latest --activate` | `RUN corepack enable` | Use actual: just `corepack enable` |
| `Dockerfile`: No BuildKit secret mount in deps stage | Has `--mount=type=secret,id=GITHUB_TOKEN` | Use actual: document secret mount |
| `docker-publish.yml`: `build-push-action@v5` with `build-args: NPM_TOKEN=` | `build-push-action@v6` with `secrets: GITHUB_TOKEN=` | Use actual: BuildKit secrets, not build-args |
| `dev.sh`: No `.env.local` check, no exec prefix | Has `.env.local` check + `exec pnpm dev` | Use actual: include both improvements |
| `docker-compose.yml`: `profiles: [dev]` (YAML list) | `profiles: - dev` (YAML block) | Equivalent -- either form works |
| Spec CLAUDE.md Commands: `docker build -t app .` | Needs `--secret` flag for BuildKit | Document correct build command with secret |

## Sonner/Toast Research for DOCS-04

### Library: sonner

**Version:** Latest stable (check npm). Used by shadcn/ui as default toast component.
**Confidence:** HIGH (official docs + shadcn/ui integration verified)

### Toaster Component Props (key ones for SDK)

| Prop | Type | Default | Platform Relevance |
|------|------|---------|-------------------|
| `theme` | `'light' \| 'dark' \| 'system'` | `'light'` | Platform uses light theme; expose prop for future dark mode |
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'bottom-right'` | Let apps choose position |
| `richColors` | `boolean` | `false` | Recommend `true` for better UX |
| `expand` | `boolean` | `false` | Keep default |
| `closeButton` | `boolean` | `false` | Let apps opt-in |
| `duration` | `number` | `4000` | Reasonable default |
| `offset` | `string \| number` | `'32px'` | Keep default |

### toast() API Surface to Expose

| Function | Purpose |
|----------|---------|
| `toast(message)` | Default notification |
| `toast.success(message)` | Success with checkmark |
| `toast.error(message)` | Error with icon |
| `toast.info(message)` | Info notification |
| `toast.warning(message)` | Warning notification |
| `toast.loading(message)` | Loading spinner |
| `toast.promise(promise, opts)` | Auto-updates on resolve/reject |
| `toast.dismiss(id?)` | Dismiss specific or all |

### Recommended SDK Export Surface

From `@madebykav/ui`:
- `Toaster` component (themed wrapper)
- Re-export `toast` function from `sonner` (imperative API)

From `@madebykav/ui/lib/utils` or similar:
- No additional exports needed -- `toast` is the API

### CSS Variable Integration

The wrapper maps platform design tokens to Sonner's CSS variables:
- `--normal-bg` -> `var(--color-background)`
- `--normal-text` -> `var(--color-foreground)`
- `--normal-border` -> `var(--color-border)`

This ensures toasts match the platform theme without additional configuration.

## Open Questions

1. **Docker build command with secrets**
   - What we know: Dockerfile uses `--mount=type=secret,id=GITHUB_TOKEN`; CI/CD passes it via `secrets:` input
   - What's unclear: Should CLAUDE.md show the full `docker build --secret id=GITHUB_TOKEN,env=GITHUB_TOKEN -t app .` or the simpler `docker build -t app .`?
   - Recommendation: Show the full command with secrets in CLAUDE.md (accurate), and the simplified version in README.md quick reference. Add a note that the secret is required for `@madebykav/*` package installation.

2. **Sonner brief output location**
   - What we know: DOCS-04 says "generate Sonner/Toast brief"
   - What's unclear: Where should the file live? `docs/sonner-toast-brief.md`? Root?
   - Recommendation: Create at `docs/sonner-toast-brief.md` to keep root clean. This is a spec document for the platform team, not part of the template itself.

3. **Backend Proxy Pattern in CLAUDE.md**
   - What we know: Spec includes an "Advanced: Backend Proxy Pattern" section
   - What's unclear: Should this be included given it's an advanced pattern not used by the template?
   - Recommendation: Include it as the spec prescribes. It provides valuable guidance for developers who need non-JS backends.

## Sources

### Primary (HIGH confidence)
- `APP-TEMPLATE-UPDATE-FINAL.md` -- Authoritative spec document with exact CLAUDE.md and README.md content
- `UI-COMPONENT-GAPS.md` -- Sonner/Toast component gap analysis with wrapper code
- Actual source files in `src/` -- Ground truth for all code examples
- `.planning/STATE.md` -- All accumulated architectural decisions from Phases 1-3

### Secondary (MEDIUM confidence)
- [Sonner official docs](https://sonner.emilkowal.ski/) -- Toaster props, toast() API
- [shadcn/ui Sonner page](https://ui.shadcn.com/docs/components/radix/sonner) -- Integration pattern
- [Sonner GitHub](https://github.com/emilkowalski/sonner) -- Library source

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- CLAUDE.md content: HIGH -- Spec provides exact sections; codebase provides ground truth for every code example
- README.md content: HIGH -- Spec provides exact sections; codebase provides ground truth
- Sonner/Toast brief: HIGH -- UI-COMPONENT-GAPS.md provides wrapper code; Sonner official docs provide API surface
- Spec-vs-reality discrepancies: HIGH -- Direct file comparison performed

**Research date:** 2026-02-25
**Valid until:** Indefinite (documentation of current state, no external dependencies moving)
