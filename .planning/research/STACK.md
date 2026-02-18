# Stack Research

**Domain:** Production Next.js app template with Docker deployment, declarative RLS, and CI/CD
**Researched:** 2026-02-18
**Confidence:** HIGH (existing stack is decided; research validates versions, fills gaps, and flags pitfalls)

## Context

This is NOT a greenfield stack decision. The existing app template already uses Next.js 15, React 19, TypeScript, pnpm, Tailwind CSS v4, Drizzle ORM, and postgres.js. The v2 update adds Docker deployment, Drizzle 0.45 declarative RLS, Tailwind v4 CSS-based config, health probes, and GitHub Actions CI/CD. This document validates the update spec's technology choices and provides precise version guidance.

---

## Recommended Stack

### Core Technologies (Existing -- No Change)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | `^15.1.6` (latest 15.x: 15.5.12; Next 16 is out but spec stays on 15) | App framework with App Router, RSC, Server Actions | Already in use. Stay on 15. The auth SDK supports ^14-^16 so there is no pressure to bump. Next.js 16 is GA but the spec explicitly decided to stay on 15 for template stability. |
| React | `^19.0.0` (latest: 19.1.0) | UI library | Already in use. React 19 is stable with RSC, Server Actions, `use()` hook. |
| TypeScript | `^5.7.3` (latest: 5.9.3) | Type safety | Already in use. The ^5.7.3 range will resolve to latest 5.x. No action needed. |
| pnpm | `9.x` | Package manager | Already in use. Workspace-aware, fast, content-addressable storage. Used for the SDK packages. |
| Tailwind CSS | `^4.0.6` (latest: 4.1.18) | Utility-first CSS | Already in the devDependencies. v4 uses CSS-based config -- the update removes `tailwind.config.ts` and switches to `@import "tailwindcss"`. |
| postgres.js (postgresjs) | `^3.4.5` (latest: 3.4.8) | PostgreSQL driver | Already in use. Lightweight, no native bindings, works well in Docker Alpine. |

**Confidence: HIGH** -- versions verified via `npm view` on 2026-02-18.

### Database & ORM (Version Bump Required)

| Technology | Current | Target | Purpose | Why |
|------------|---------|--------|---------|-----|
| drizzle-orm | `^0.38.4` | `^0.45.0` | ORM with schema-defined RLS via `pgPolicy()` | Required by `@madebykav/db` peer dependency. Version 0.45.x includes declarative RLS support via `pgPolicy()` in `pgTable()` third argument. Latest stable: 0.45.1. |
| drizzle-kit | `^0.30.4` | `^0.30.4` (resolves to 0.31.9) | Schema migrations and push | The ^0.30.4 range resolves to 0.31.9 (latest stable). drizzle-kit 0.31.x is compatible with drizzle-orm 0.45.x. |

**Confidence: HIGH** -- versions verified via `npm view drizzle-orm@latest` = 0.45.1, `npm view drizzle-kit@latest` = 0.31.9.

**CRITICAL WARNING:** There is a known bug where `drizzle-kit push` creates RLS policies with **empty USING clauses** while `drizzle-kit generate` + `drizzle-kit migrate` works correctly (GitHub issue #3504, labeled "bug/fixed-in-beta"). This means for dev setup, `db:push` may silently create broken RLS policies. The fix is only in the v1 beta. Workaround: use `generate` + `migrate` workflow for RLS tables, or verify policies manually after push. See PITFALLS.md for full details.

### SDK Packages (Pinned Versions)

| Package | Current | Target | Purpose | Why Pin |
|---------|---------|--------|---------|---------|
| `@madebykav/auth` | `latest` | `^0.2.0` | Authentication via proxy headers | Breaking change to AuthContext type (fields renamed/added). Pin to avoid surprise breakage. |
| `@madebykav/db` | `latest` | `^0.1.0` | RLS tenant isolation (`withTenant`, `createTenantPolicy`) | Requires drizzle-orm ^0.45.0 as peer dep. Pin for stability. |
| `@madebykav/ui` | `latest` | `^0.1.2` | Shared UI components (Button, Card, Input) | Pin for stability. |
| `@madebykav/ai` | `latest` | **removed** | AI capabilities | Optional; not every app needs it. Devs add when needed. |

**Confidence: HIGH** -- versions specified in the update spec, which is the single source of truth.

### Infrastructure (New for v2)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Docker (multi-stage Dockerfile) | N/A | Production container builds | Next.js `output: 'standalone'` produces a minimal server.js + traced deps. Multi-stage build yields ~200MB images vs ~1.5GB with full node_modules. Alpine base keeps it small. |
| Node.js (Docker base) | `node:20-alpine` | Runtime base image | Node 20 is Maintenance LTS (EOL April 2026). Node 22 is Active LTS and would work, but the spec uses 20. **Recommendation: use `node:22-alpine`** for longer support (EOL April 2027). See "Alternatives Considered" below. |
| PostgreSQL | `16-alpine` | Local dev database via docker-compose | Stable, widely deployed. Used only for local dev; production DB is managed by platform admin. |
| GitHub Actions | `ubuntu-latest` | CI/CD runner | Standard. |
| docker/login-action | `v3` | GHCR authentication | Current stable version. |
| docker/metadata-action | `v5` | Image tagging (SHA + latest) | Current stable version. |
| docker/build-push-action | `v6` | Build and push to GHCR | Current stable version (v6.18.0). Supports BuildKit, cache, secrets. |
| actions/checkout | `v4` | Repository checkout | Current stable version. |
| GitHub Container Registry (ghcr.io) | N/A | Docker image hosting | Free for public repos, integrated with GitHub permissions, no separate registry to manage. |

**Confidence: HIGH** -- GitHub Actions versions verified via official Docker docs and GitHub repositories on 2026-02-18.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm` (sql template tag) | (bundled) | Raw SQL via `sql` tagged template | Health check readiness probe: `db.execute(sql\`SELECT 1\`)` |
| `next/navigation` (`redirect`) | (bundled) | Server-side redirects | Logout action redirects to platform's `/logout` endpoint |

No new dependencies are introduced by the v2 update beyond the version bumps.

---

## Tailwind CSS v4: Migration Details

The update removes `tailwind.config.ts` and switches to CSS-based configuration. Key changes:

### Before (v3 pattern, current template)
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}'],
}
export default config
```

### After (v4 pattern, target)
```css
/* globals.css */
@import "tailwindcss";
@import "@madebykav/ui/globals.css";

@source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}";

@theme inline {
  /* App-specific theme overrides */
}

body {
  @apply bg-background text-foreground antialiased;
}
```

**Key v4 changes:**
1. **`@import "tailwindcss"`** replaces three `@tailwind` directives. Single line.
2. **`@source` directive** tells Tailwind to scan external packages for class names. Required because `node_modules` is gitignored and v4 auto-detects based on git-tracked files.
3. **`@theme` directive** replaces the JavaScript `theme` config. Use `@theme inline` to avoid generating CSS custom properties for overrides.
4. **No `tailwind.config.ts` file** -- delete it. All config lives in CSS.
5. **Important modifier** syntax changed: `!flex` becomes `flex!` (bang at end).
6. **Custom utilities** use `@utility` instead of `@layer utilities`.

**Confidence: HIGH** -- verified against official Tailwind v4 upgrade guide at tailwindcss.com/docs/upgrade-guide.

---

## Drizzle ORM 0.45: Declarative RLS via pgPolicy()

### Before (current template -- manual SQL)
```typescript
// Schema defines table, then you manually run:
// SELECT create_tenant_policy('example_items');
export const exampleItems = pgTable('example_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  // ...
})
```

### After (v2 -- declarative in schema)
```typescript
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

**How `pgPolicy()` works:**
- Accepts a policy name and options object with `as`, `to`, `for`, `using`, and `withCheck` fields
- `createTenantPolicy()` from `@madebykav/db` returns the standard tenant isolation policy options (USING clause that filters by `tenant_id`)
- Policies are defined as the third argument to `pgTable()`, returned as an array
- `drizzle-kit generate` produces migration SQL that includes `CREATE POLICY` and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

**Confidence: HIGH** -- pgPolicy API verified against official Drizzle RLS docs at orm.drizzle.team/docs/rls.

---

## Docker Build: Multi-Stage Standalone Pattern

### Architecture
```
Stage 1: base       -- node:20-alpine + corepack enable
Stage 2: deps       -- pnpm install --frozen-lockfile
Stage 3: builder    -- copy source, pnpm build (produces .next/standalone)
Stage 4: runner     -- copy standalone + public + static, run as non-root user
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Base image | `node:20-alpine` (spec) / `node:22-alpine` (recommended) | Alpine is ~50MB vs ~350MB for Debian slim. postgres.js has no native bindings, so Alpine's musl libc is fine. |
| Output mode | `output: 'standalone'` in next.config.ts | Produces minimal server.js + traced dependencies. Image goes from ~1.5GB to ~200MB. |
| Package manager in Docker | corepack enable + pnpm | corepack is built into Node.js. No need to install pnpm separately. |
| Non-root user | `nextjs` user (UID 1001) | Security best practice. Never run containers as root. |
| Health check | `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health \|\| exit 1` | wget is pre-installed on Alpine (unlike curl). Hits the liveness probe endpoint. |
| Static files | Copied into standalone folder | Self-contained; no external CDN needed for platform apps. |
| HOSTNAME binding | `ENV HOSTNAME="0.0.0.0"` | Required for Next.js standalone to listen on all interfaces inside the container. |

**Confidence: HIGH** -- standalone output behavior verified against Next.js official docs (nextjs.org/docs).

---

## GitHub Actions CI/CD: Docker Publish Pattern

### Workflow Structure
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - actions/checkout@v4
      - docker/login-action@v3        # Authenticate with GHCR
      - docker/metadata-action@v5     # Generate tags (SHA + latest)
      - docker/build-push-action@v6   # Build and push
```

### NPM_TOKEN for Private Packages

The Dockerfile needs access to `@madebykav/*` packages from GitHub Packages during build. The spec uses `build-args` to pass `NPM_TOKEN`:

```yaml
build-args: |
  NPM_TOKEN=${{ secrets.NPM_TOKEN }}
```

**Security note:** Build args are stored in image layer history. A more secure approach uses Docker BuildKit secrets:

```dockerfile
# In Dockerfile
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc pnpm install --frozen-lockfile
```

```yaml
# In workflow
secrets: |
  npmrc=${{ secrets.NPMRC }}
```

However, the spec uses build-args for simplicity and the images are pushed to a private GHCR registry, so the risk is acceptable. Flag this as a future improvement.

**Confidence: HIGH** -- Actions versions verified against official Docker GitHub Actions docs.

---

## Health Probe Endpoints

| Endpoint | Type | Response | Purpose |
|----------|------|----------|---------|
| `GET /api/health` | Liveness | `{"status":"ok"}` (always 200) | Tells orchestrator the process is running. No dependency checks. |
| `GET /api/health/ready` | Readiness | `{"status":"ready"}` (200) or `{"status":"not ready"}` (503) | Checks database connectivity via `db.execute(sql\`SELECT 1\`)`. Returns 503 if DB is unreachable. |

This is the standard Kubernetes/Docker health probe pattern:
- **Liveness** = "is the process alive?" (restart if not)
- **Readiness** = "can it serve traffic?" (remove from load balancer if not)

The Dockerfile HEALTHCHECK uses the liveness probe. The platform's Caddy reverse proxy or Docker orchestrator can use the readiness probe for routing decisions.

**Confidence: HIGH** -- standard pattern, well-documented.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Node.js Docker base | `node:20-alpine` (spec) | `node:22-alpine` | Node 22 is Active LTS (EOL April 2027) vs Node 20 Maintenance LTS (EOL April 2026). **Recommend bumping to 22** for longer support runway. The spec uses 20, which is fine short-term. |
| Node.js Docker base | Alpine | Debian Slim (`bookworm-slim`) | Alpine is not officially supported by the Node.js Docker team, but works perfectly for apps without native bindings. postgres.js is pure JS. Alpine wins on image size (~50MB vs ~80MB base). |
| ORM | drizzle-orm 0.45 (stable) | drizzle-orm v1 beta | v1 beta introduces breaking changes (migration folder restructure, relational queries v2, `.enableRLS()` deprecated). Not suitable for a stable template. Stay on 0.45.x until v1 is GA. |
| Docker image tagging | SHA + latest | Semantic versioning | The spec tags with commit SHA and `latest` on main. For a template, this is appropriate. Full semver tagging can be added when apps use release workflows. |
| NPM token injection | build-args | BuildKit secrets (`--mount=type=secret`) | Secrets are more secure (not in layer history), but require Buildx setup and more complex Dockerfile. Build-args are simpler and the GHCR registry is private. Acceptable tradeoff. |
| CSS framework | Tailwind v4 CSS config | Tailwind v3 JS config | v3 is maintenance mode. v4 is the active version. The template already has Tailwind v4 in devDependencies (4.0.6+). Must use CSS config. |
| Health check tool | wget (Alpine built-in) | curl | curl is not installed on Alpine by default. Installing it adds ~5MB. wget does the job. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tailwind.config.ts` / `tailwind.config.js` | Tailwind v4 uses CSS-based config. JS config files are not auto-detected. | `@import "tailwindcss"` + `@theme` + `@source` in `globals.css` |
| `@tailwind base/components/utilities` directives | Removed in Tailwind v4. | `@import "tailwindcss"` (single import) |
| `drizzle-orm@latest` tag for SDK packages | Floating `latest` tag causes surprise breakage on publish. | Pin with `^0.2.0`, `^0.1.0`, `^0.1.2` |
| `drizzle-orm` v1 beta in production template | Breaking changes, migration folder restructure, not GA. | Stay on `^0.45.0` stable. |
| `withoutRLS()` in app code | Bypasses tenant isolation. Admin-only operation. | `withTenant()` for all app queries. |
| Manual `SELECT create_tenant_policy()` SQL | Error-prone, out of sync with schema. | Declarative `pgPolicy()` in `pgTable()` schema definition. |
| `getAuthContext()` in root layout | Forces every page to be dynamic (opts out of static generation). | Call `getAuthContext()` per-page where auth is needed. |
| Running Docker containers as root | Security risk. Container breakout gives root access to host. | Create non-root user (`nextjs`, UID 1001) in Dockerfile. |
| `curl` in Alpine HEALTHCHECK | Not installed by default on Alpine. | `wget -qO-` (pre-installed). |
| `npm` or `yarn` in Dockerfile | Project uses pnpm. Mixing package managers causes lockfile conflicts. | `corepack enable` + `pnpm install --frozen-lockfile` |

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `drizzle-orm@^0.45.0` | `drizzle-kit@^0.30.4` (resolves to 0.31.9) | drizzle-kit 0.31.x works with drizzle-orm 0.45.x. Verified via npm dist-tags. |
| `drizzle-orm@^0.45.0` | `postgres@^3.4.5` | postgres is a peer dep of drizzle-orm (`>=3`). |
| `next@^15.1.6` | `react@^19.0.0` + `react-dom@^19.0.0` | Next.js 15 requires React 19. |
| `tailwindcss@^4.0.6` | No `tailwind.config.ts` | v4 uses CSS config. Delete the JS config file. |
| `@madebykav/db@^0.1.0` | `drizzle-orm@^0.45.0` | SDK requires drizzle-orm 0.45+ as peer dep. **Install will fail with drizzle-orm 0.38.x.** |
| `@madebykav/auth@^0.2.0` | `next@^14 \|\| ^15 \|\| ^16` | Works across Next.js versions. |
| `node:20-alpine` | `corepack` (built-in) | corepack ships with Node 20+. |
| `docker/build-push-action@v6` | `docker/login-action@v3`, `docker/metadata-action@v5` | All current stable versions as of Feb 2026. |

---

## Installation

```bash
# After cloning the template and configuring .npmrc with GitHub token:

# Install dependencies
pnpm install

# If upgrading from v1 template:
# 1. Update package.json versions per above
# 2. Delete tailwind.config.ts
# 3. Update globals.css to use @import "tailwindcss"
# 4. Update schema.ts to use pgPolicy()
# 5. Run:
pnpm install
pnpm build  # Verify no TypeScript errors
```

---

## Stack Patterns by Variant

**If deploying to Docker (standard platform deployment):**
- Set `output: 'standalone'` in next.config.ts
- Use multi-stage Dockerfile with node:20-alpine base
- Copy `.next/standalone`, `.next/static`, and `public` to runner stage
- Set `HOSTNAME="0.0.0.0"` and `PORT=3000`
- Include health probe endpoints

**If deploying to Vercel (optional, for developers who prefer it):**
- `output: 'standalone'` is harmless on Vercel (ignored)
- No Dockerfile needed
- Health probes still work (they are just API routes)
- Set env vars in Vercel dashboard

**If app needs a non-JS backend (Python ML, etc.):**
- Use the Backend Proxy Pattern from the spec
- Create `src/lib/backend-fetch.ts` to proxy requests with auth headers
- Keep Next.js as the frontend container; add backend as separate container in the platform stack

---

## Sources

- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) -- pgPolicy API, declarative RLS syntax (HIGH confidence)
- [Drizzle ORM GitHub issue #3504](https://github.com/drizzle-team/drizzle-orm/issues/3504) -- db:push RLS bug, closed as fixed-in-beta (HIGH confidence)
- [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) -- @import, @source, @theme migration (HIGH confidence)
- [Tailwind CSS v4 blog post](https://tailwindcss.com/blog/tailwindcss-v4) -- v4 release details (HIGH confidence)
- [Next.js output: standalone docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) -- standalone mode, server.js, Docker usage (HIGH confidence)
- [pnpm Docker docs](https://pnpm.io/docker) -- corepack enable, multi-stage build pattern (HIGH confidence)
- [docker/build-push-action](https://github.com/docker/build-push-action) -- v6, GitHub Actions workflow (HIGH confidence)
- [docker/login-action](https://github.com/docker/login-action) -- v3, GHCR authentication (HIGH confidence)
- [docker/metadata-action](https://github.com/docker/metadata-action) -- v5, image tagging (HIGH confidence)
- [Node.js Docker images](https://hub.docker.com/_/node) -- Alpine vs Slim, LTS versions (HIGH confidence)
- npm registry (direct queries on 2026-02-18) -- drizzle-orm@latest=0.45.1, drizzle-kit@latest=0.31.9, next@latest=16.1.6 (next@15.x latest=15.5.12), tailwindcss@latest=4.1.18, typescript@latest=5.9.3, postgres@latest=3.4.8 (HIGH confidence)

---
*Stack research for: MadeByKav App Template v2*
*Researched: 2026-02-18*
