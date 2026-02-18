# Architecture Research

**Domain:** Docker-deployed Next.js multi-tenant app behind reverse proxy auth
**Researched:** 2026-02-18
**Confidence:** HIGH

## System Overview

```
                          PRODUCTION
 ============================================================

 Browser
   |  cookie: __Secure-mbk_session
   v
 +---------------------------------------------------------+
 | Caddy Reverse Proxy (*.madebykav.com)                   |
 |  - Strips incoming identity headers (anti-spoofing)     |
 |  - forward_auth --> auth-validator:3001/validate        |
 |  - Copies 6 response headers onto upstream request      |
 +---------------------------------------------------------+
   |  X-Tenant-Id, X-User-Id, X-User-Role,
   |  X-User-Email, X-Tenant-Slug, X-User-Name
   v
 +---------------------------------------------------------+
 | App Container (Next.js standalone, port 3000)           |
 |  - Reads trusted headers via @madebykav/auth SDK        |
 |  - Zero DB calls for auth                               |
 |  - Health probes: /api/health, /api/health/ready        |
 +---------------------------------------------------------+
   |
   v
 +---------------------------------------------------------+
 | App-Owned PostgreSQL Database                           |
 |  - RLS via withTenant() from @madebykav/db              |
 |  - Declarative policies via pgPolicy() in schema        |
 |  - One DB per app, multi-tenant within it               |
 +---------------------------------------------------------+


                          LOCAL DEV
 ============================================================

 Browser (localhost:3000)
   |  cookie: __Secure-mbk_session (validated by SDK)
   v
 +---------------------------------------------------------+
 | Next.js Dev Server (pnpm dev)                           |
 |  - @madebykav/auth falls back to cookie validation      |
 |  - No proxy, no identity headers                        |
 +---------------------------------------------------------+
   |
   v
 +---------------------------------------------------------+
 | docker-compose PostgreSQL (port 5433)                   |
 |  - Profile: dev (only starts when requested)            |
 |  - Volume: pgdata for persistence                       |
 +---------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Caddy Reverse Proxy | TLS termination, subdomain routing, auth delegation via `forward_auth`, header anti-spoofing | Platform-managed Caddyfile; strips then injects identity headers |
| Auth Validator | Session validation, tenant-app access control, identity header generation | Standalone service at auth-validator:3001/validate; returns 6 headers on 2xx |
| App Container | Business logic, API routes, SSR pages, health probes | Next.js standalone output running `node server.js` on port 3000 |
| App Database | Persistent storage with tenant isolation | PostgreSQL 16 with RLS; one database per app, multi-tenant within |
| @madebykav/auth SDK | Read identity from proxy headers (prod) or validate cookie (dev) | `getAuthContext()` returns typed AuthContext or null |
| @madebykav/db SDK | RLS-scoped queries, declarative policy creation | `withTenant(db, tenantId, callback)` wraps every query |
| @madebykav/ui SDK | Shared component library (Button, Card, Input) | shadcn/ui-based components with platform theme |
| CI/CD Pipeline | Build Docker image, push to GHCR on merge to main | GitHub Actions with docker/build-push-action |
| docker-compose | Local dev database lifecycle | PostgreSQL on port 5433 with `dev` profile |
| dev.sh | One-command local dev bootstrap | Starts postgres, waits for readiness, pushes schema, runs dev server |

## Recommended Project Structure

```
/
+-- .github/
|   +-- workflows/
|       +-- docker-publish.yml    # CI/CD: build + push to GHCR
+-- src/
|   +-- app/                      # Next.js App Router
|   |   +-- layout.tsx            # Root layout (NO auth call)
|   |   +-- page.tsx              # Dashboard with auth + data
|   |   +-- globals.css           # Tailwind v4 + @madebykav/ui theme
|   |   +-- actions/
|   |   |   +-- auth.ts           # Logout server action
|   |   +-- api/
|   |       +-- example/
|   |       |   +-- route.ts      # CRUD endpoints
|   |       +-- health/
|   |           +-- route.ts      # Liveness probe (always 200)
|   |           +-- ready/
|   |               +-- route.ts  # Readiness probe (checks DB)
|   +-- lib/
|   |   +-- db/
|   |       +-- index.ts          # Drizzle connection
|   |       +-- schema.ts         # Tables with declarative RLS
|   +-- components/               # App-specific components
+-- Dockerfile                    # Multi-stage: deps -> build -> runner
+-- .dockerignore                 # Exclude node_modules, .next, .env*, .git
+-- docker-compose.yml            # Local dev postgres (port 5433)
+-- dev.sh                        # One-command dev bootstrap
+-- next.config.ts                # output: 'standalone' + transpilePackages
+-- drizzle.config.ts             # Drizzle Kit config
+-- package.json                  # Pinned SDK versions
+-- .npmrc                        # GitHub Packages registry for @madebykav scope
+-- .env.example                  # Documented env vars with dev defaults
+-- .env.local                    # Local secrets (gitignored)
```

### Structure Rationale

- **src/app/api/health/**: Health probes are API routes so they run on the Next.js server, not static files. Liveness at `/api/health` (always 200) and readiness at `/api/health/ready` (checks DB connection) follow the Kubernetes two-probe pattern even though we use Docker -- this makes future K8s migration trivial.
- **src/app/actions/**: Server Actions for mutations. The logout action redirects to the platform's `/logout` endpoint because the app never owns session lifecycle.
- **src/lib/db/**: Schema and connection are co-located. No SDK re-exports -- import `withTenant` directly from `@madebykav/db` to make the dependency explicit.
- **Dockerfile at root**: Standard convention. Multi-stage build keeps final image small (~130-180MB vs ~1GB with full node_modules).
- **docker-compose.yml at root**: Dev-only. Uses `profiles: [dev]` so `docker compose up` does nothing by default; must use `--profile dev` explicitly.

## Architectural Patterns

### Pattern 1: Proxy-Delegated Authentication (Forward Auth)

**What:** Caddy's `forward_auth` directive makes a subrequest to auth-validator before proxying to the app. On 2xx, specified response headers are copied onto the original request as trusted identity headers. The app reads headers, never validates sessions.

**When to use:** Always in production. This is the platform's auth model.

**Trade-offs:**
- PRO: Zero auth code in apps. Auth changes (MFA, SSO) happen once at the proxy layer.
- PRO: No database calls for auth in the app's hot path.
- CON: Apps cannot function without the proxy in production (by design).
- CON: Local dev needs a fallback mechanism (handled by SDK cookie validation).

**How Caddy forward_auth works:**
```
# Caddy converts the request to GET (preserving original method/URI in headers)
# Sends to auth-validator with X-Forwarded-Method, X-Forwarded-Uri
# On 2xx response: copies listed headers onto the original request
# On non-2xx: returns the auth-validator's response to the client (e.g., 401)

forward_auth auth-validator:3001 {
    uri /validate
    copy_headers {
        X-Tenant-Id
        X-User-Id
        X-User-Role
        X-User-Email
        X-Tenant-Slug
        X-User-Name
    }
}
```

**App-side reading (via SDK):**
```typescript
// @madebykav/auth getAuthContext() reads headers() from Next.js
// In production: reads X-Tenant-Id, X-User-Id, etc.
// In local dev: falls back to cookie validation against platform DB
const auth = await getAuthContext()
// Returns: AuthContext { tenantId, userId, email, name, role, tenantSlug } | null
```

### Pattern 2: Next.js Standalone Output for Docker

**What:** `output: 'standalone'` in next.config.ts tells Next.js to use `@vercel/nft` to trace all file dependencies and produce a self-contained `.next/standalone/` folder with a minimal `server.js`. This folder runs without `node_modules` installation.

**When to use:** Always when deploying via Docker.

**Trade-offs:**
- PRO: Final Docker image is ~130-180MB instead of ~1GB.
- PRO: Only traced dependencies included -- smaller attack surface.
- CON: `public/` and `.next/static/` are NOT auto-copied to standalone. Must copy manually in Dockerfile.
- CON: `NEXT_PUBLIC_*` variables are baked at build time -- cannot change at runtime.
- CON: Monorepo packages may need `outputFileTracingRoot` configuration.

**Docker copy pattern (from official Next.js example):**
```dockerfile
# These three COPY instructions are the critical standalone pattern:
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
```

### Pattern 3: Multi-Stage Docker Build

**What:** Three-stage Dockerfile (deps, builder, runner) that produces a minimal production image.

**When to use:** Always for production Docker images.

**The three stages:**

```dockerfile
# Stage 1: DEPS -- install node_modules (cached when lockfile unchanged)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Stage 2: BUILDER -- compile Next.js with standalone output
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: RUNNER -- minimal production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
# Copy only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Why this matters:**
- deps stage caches unless package.json/lockfile changes.
- builder stage caches unless source code changes.
- runner stage contains only the traced standalone output -- no dev dependencies, no source code, no build tools.

### Pattern 4: Two-Tier Health Probes

**What:** Separate liveness and readiness endpoints. Liveness always returns 200 (confirms process is alive). Readiness checks downstream dependencies (database).

**When to use:** Any containerized deployment (Docker, K8s, Docker Swarm).

**Implementation:**
```typescript
// /api/health/route.ts -- Liveness (always 200)
export async function GET() {
  return Response.json({ status: 'ok' })
}

// /api/health/ready/route.ts -- Readiness (checks DB)
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ready' })
  } catch {
    return Response.json({ status: 'not ready' }, { status: 503 })
  }
}
```

**Docker HEALTHCHECK in Dockerfile:**
```dockerfile
HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1
```

Use `wget` over `curl` in Alpine images because `wget` is available by default in `node:20-alpine` while `curl` requires explicit installation (`apk add curl`).

### Pattern 5: Private Registry Auth in Docker Build

**What:** Pass GitHub token as build argument so `pnpm install` can fetch `@madebykav/*` packages from GitHub Packages during Docker build.

**When to use:** Any Docker build that installs private `@madebykav/*` packages.

**Security consideration:** Build args are visible in image layer history. For maximum security, use Docker BuildKit secrets (`--mount=type=secret`). For this template, build args are acceptable because the token only has `read:packages` scope and the image is pushed to a private GHCR registry.

**Dockerfile approach:**
```dockerfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
ARG NPM_TOKEN
RUN echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc && \
    pnpm install --frozen-lockfile && \
    sed -i '/_authToken/d' .npmrc
```

**GitHub Actions passes the token:**
```yaml
- uses: docker/build-push-action@v5
  with:
    build-args: |
      NPM_TOKEN=${{ secrets.NPM_TOKEN }}
```

## Data Flow

### Production Request Flow

```
Browser (cookie: __Secure-mbk_session)
    |
    v
Caddy (strips client identity headers)
    |
    | forward_auth subrequest (GET)
    v
Auth Validator (validates session, checks tenant-app access)
    |
    | 2xx: returns 6 identity headers
    | non-2xx: returned to client (401/302)
    v
Caddy (copies identity headers onto original request)
    |
    v
App Container (reads X-Tenant-Id etc. via @madebykav/auth)
    |
    | withTenant(db, tenantId, query)
    | SET LOCAL app.tenant_id = tenantId; <query>; RESET app.tenant_id;
    v
PostgreSQL (RLS policy filters rows by current_setting('app.tenant_id'))
    |
    v
Response --> Caddy --> Browser
```

### Local Dev Request Flow

```
Browser (cookie: __Secure-mbk_session)
    |
    v
Next.js Dev Server (localhost:3000)
    |
    | No proxy headers present
    | @madebykav/auth SDK detects standalone mode
    | Falls back to cookie validation against platform DB
    |
    v
Auth context resolved (or null)
    |
    | withTenant(db, tenantId, query)
    v
Local PostgreSQL (docker-compose, port 5433)
    |
    v
Response --> Browser
```

### CI/CD Flow

```
Developer pushes to main branch
    |
    v
GitHub Actions triggered (docker-publish.yml)
    |
    +-- Checkout code
    +-- Login to GHCR (ghcr.io)
    +-- Extract metadata (SHA tag + latest tag)
    +-- Build Docker image (multi-stage)
    |   +-- Pass NPM_TOKEN as build arg
    |   +-- pnpm install with --frozen-lockfile
    |   +-- pnpm build (standalone output)
    |   +-- Copy standalone + public + static to runner
    +-- Push to ghcr.io/{org}/{repo}:sha-{commit}, :latest
    |
    v
Platform admin deploys image via admin panel
```

### Key Data Flows

1. **Auth identity flow:** Browser cookie --> Caddy --> Auth Validator --> 6 headers --> App. The app never touches the session. Identity is trusted because Caddy strips incoming identity headers before `forward_auth` (anti-spoofing).

2. **Tenant data isolation flow:** Auth context provides `tenantId` --> `withTenant()` sets PostgreSQL session variable `app.tenant_id` --> RLS policy on every table filters by `current_setting('app.tenant_id')` --> query sees only that tenant's rows.

3. **Schema deployment flow:** Developer edits `schema.ts` (includes `pgPolicy()`) --> `pnpm db:push` creates tables AND applies RLS policies declaratively --> no manual SQL needed.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 tenants | Single app container, single postgres instance. Current architecture is correct. |
| 5-50 tenants | Same architecture. PostgreSQL connection pooling may be needed if apps have high concurrency. Add `max: 10` to postgres.js config. |
| 50-500 tenants | Consider read replicas for read-heavy apps. Caddy can round-robin across multiple app containers. DATABASE_URL can point to a pooler (PgBouncer). |
| 500+ tenants | Shard by tenant groups to separate databases. This requires platform-level routing changes, not app template changes. |

### Scaling Priorities

1. **First bottleneck: PostgreSQL connections.** Each `withTenant()` call opens a transaction. The `postgres` driver defaults to 10 connections. Under load, add `max` to the connection config and/or introduce PgBouncer.

2. **Second bottleneck: Container memory.** Next.js standalone server uses ~80-120MB RAM at baseline. SSR with complex pages can spike. Set Docker memory limits and monitor with the readiness probe.

3. **Third bottleneck: Build time in CI.** Docker layer caching in GitHub Actions (cache-from/cache-to with registry) can reduce build times from ~5min to ~1-2min on cache hit.

## Anti-Patterns

### Anti-Pattern 1: Auth in Root Layout

**What people do:** Call `getAuthContext()` in `src/app/layout.tsx`.
**Why it's wrong:** Forces every page in the app to be dynamically rendered. Prevents static optimization of pages that don't need auth (like a public landing page).
**Do this instead:** Call `getAuthContext()` in individual page components that need it. The root layout should be synchronous.

### Anti-Pattern 2: Direct Database Queries Without withTenant()

**What people do:** `db.select().from(myTable)` directly, bypassing RLS.
**Why it's wrong:** Returns data from ALL tenants. This is a data leak. RLS only works when `app.tenant_id` is set via `withTenant()`.
**Do this instead:** Always wrap queries in `withTenant(db, auth.tenantId, async (tx) => { ... })`.

### Anti-Pattern 3: NEXT_PUBLIC_ for Runtime Secrets

**What people do:** Use `NEXT_PUBLIC_API_KEY` and expect to change it between environments by changing the Docker env var.
**Why it's wrong:** `NEXT_PUBLIC_*` values are baked into the JavaScript bundle at build time. They cannot be changed at container runtime.
**Do this instead:** Use server-side env vars (no `NEXT_PUBLIC_` prefix) accessed only in Server Components, API routes, or Server Actions. For the few values that genuinely must be in the client bundle, accept that they are build-time constants.

### Anti-Pattern 4: Skipping .dockerignore

**What people do:** Build Docker images without a `.dockerignore`.
**Why it's wrong:** Sends `node_modules/` (~200MB+), `.next/` build cache, `.env.local` secrets, and `.git/` history into the build context. Slows builds dramatically and risks leaking secrets into image layers.
**Do this instead:** Always have a `.dockerignore` that excludes `node_modules`, `.next`, `.git`, `.env*`, `*.md`, `drizzle/`.

### Anti-Pattern 5: Exposing App Container Port to Host Network

**What people do:** Map port 3000 on the Docker host directly to the internet.
**Why it's wrong:** Bypasses Caddy's auth. Anyone can access the app without authentication. Identity headers can be spoofed.
**Do this instead:** The app container should only be accessible via Docker's internal network. Caddy is the only entry point from the internet.

### Anti-Pattern 6: Installing curl in Alpine for Health Checks

**What people do:** `RUN apk add --no-cache curl` then use `curl` for HEALTHCHECK.
**Why it's wrong:** Adds an unnecessary package to the minimal Alpine image, increasing size and attack surface.
**Do this instead:** Use `wget` which is pre-installed in `node:20-alpine`: `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Caddy Reverse Proxy | forward_auth + reverse_proxy directives | Platform-managed. App has no control over Caddy config. |
| Auth Validator | Indirect via Caddy forward_auth | App never calls auth-validator directly. |
| GitHub Packages (npm) | .npmrc with `@madebykav:registry=https://npm.pkg.github.com` | NPM_TOKEN needed at install time only (build arg in Docker). |
| GHCR (Docker images) | CI/CD pushes via `docker/build-push-action` | GITHUB_TOKEN with `packages: write` permission. |
| Platform Portal | Logout redirect to `PLATFORM_URL/logout` | Cookie clearing happens at platform. App just redirects. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| App <--> Database | TCP via DATABASE_URL | Connection string set via env var. `prepare: false` for pooler compatibility. |
| App <--> Auth (prod) | HTTP headers injected by Caddy | App reads, never writes auth headers. Trust is unidirectional. |
| App <--> Auth (dev) | Cookie validation via SDK | SDK detects no proxy headers, falls back to direct cookie validation. |
| Next.js Server Components <--> API Routes | Internal (same process) | Server Components can call DB directly. API routes exist for client-side fetches. |
| Docker HEALTHCHECK <--> App | HTTP GET to localhost:3000/api/health | wget inside the container; does not go through Caddy. |
| CI/CD <--> App Repo | GitHub Actions on push to main | Triggers Docker build + push. No deployment -- platform admin deploys manually. |

## Build Order (Dependencies Between Components)

The following build order reflects implementation dependencies. Later items depend on earlier ones.

```
1. next.config.ts (output: 'standalone')
   |  Required by: Dockerfile, CI/CD
   |
2. .env.example + drizzle.config.ts
   |  Required by: docker-compose, dev.sh, schema push
   |
3. docker-compose.yml (local dev postgres)
   |  Required by: dev.sh, local testing of schema/app
   |
4. src/lib/db/schema.ts (declarative RLS with pgPolicy)
   |  Required by: health/ready probe, example CRUD, all data access
   |
5. src/lib/db/index.ts (Drizzle connection)
   |  Required by: schema push, health/ready probe, all API routes
   |
6. src/app/api/health/ (liveness + readiness probes)
   |  Required by: Dockerfile HEALTHCHECK, platform deployment
   |
7. dev.sh (one-command bootstrap)
   |  Required by: developer experience (depends on 2, 3)
   |
8. Dockerfile + .dockerignore (multi-stage build)
   |  Required by: CI/CD, production deployment
   |  Depends on: 1 (standalone), 6 (health check)
   |
9. .github/workflows/docker-publish.yml (CI/CD)
   |  Required by: automated deployment pipeline
   |  Depends on: 8 (Dockerfile)
   |
10. App code updates (layout.tsx, page.tsx, API routes, globals.css)
    |  Can be done in parallel with 6-9
    |  Depends on: 4, 5 (schema and DB connection)
```

**Implication for roadmap phases:**
- Phase 1 should handle next.config.ts, package.json deps, and schema updates (foundations).
- Phase 2 should handle Docker infrastructure (Dockerfile, docker-compose, dev.sh, health probes).
- Phase 3 should handle CI/CD (GitHub Actions workflow).
- Phase 4 should handle app code updates and documentation (CLAUDE.md, README.md).

Items 1-5 must come before 6-9. Items 6-9 can be partially parallelized but the Dockerfile depends on health probes existing. CI/CD depends on the Dockerfile existing.

## Environment Variable Architecture

| Variable | Type | When Set | Where Used |
|----------|------|----------|------------|
| `DATABASE_URL` | Server runtime | .env.local (dev), platform env (prod) | `src/lib/db/index.ts` |
| `PLATFORM_URL` | Server runtime | .env.local (dev), platform env (prod) | `src/app/actions/auth.ts` (logout redirect) |
| `GITHUB_TOKEN` | Build-time only | ~/.npmrc (dev), secret (CI) | `pnpm install` of @madebykav packages |
| `NPM_TOKEN` | Build-time only | GitHub Actions secret | Dockerfile build arg for `pnpm install` |
| `NEXT_PUBLIC_APP_NAME` | Build-time (baked) | .env.local (dev), build env (CI) | Client-side display |
| `NEXT_PUBLIC_APP_SLUG` | Build-time (baked) | .env.local (dev), build env (CI) | Client-side display |
| `NODE_ENV` | Server runtime | Set in Dockerfile (`production`) | Next.js behavior |
| `PORT` | Server runtime | Set in Dockerfile (`3000`) | standalone server.js |
| `HOSTNAME` | Server runtime | Set in Dockerfile (`0.0.0.0`) | standalone server.js |

**Key distinction:** `NEXT_PUBLIC_*` values are frozen at Docker build time. Server-side env vars (`DATABASE_URL`, `PLATFORM_URL`) can be changed at container runtime.

## Sources

- [Next.js output configuration (official docs)](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) -- HIGH confidence
- [Official Next.js Docker example (Vercel)](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile) -- HIGH confidence
- [Caddy forward_auth directive (official docs)](https://caddyserver.com/docs/caddyfile/directives/forward_auth) -- HIGH confidence
- [Docker Compose health checks guide (Last9)](https://last9.io/blog/docker-compose-health-checks/) -- MEDIUM confidence
- [Dockerizing Next.js in 2025 (Medium)](https://medium.com/front-end-world/dockerizing-a-next-js-application-in-2025-bacdca4810fe) -- MEDIUM confidence
- [Docker best practices 2026 (BenchHub)](https://docs.benchhub.co/docs/tutorials/docker/docker-best-practices-2025) -- MEDIUM confidence
- [GitHub Actions Docker guide (Docker Docs)](https://docs.docker.com/guides/gha/) -- HIGH confidence
- [Docker and private npm modules (npm docs)](https://docs.npmjs.com/docker-and-private-modules/) -- HIGH confidence
- [Next.js standalone mode discussion (GitHub)](https://github.com/vercel/next.js/discussions/84940) -- MEDIUM confidence
- [Next.js Kubernetes health probes discussion (GitHub)](https://github.com/vercel/next.js/discussions/53492) -- MEDIUM confidence
- APP-TEMPLATE-UPDATE-FINAL.md (project spec) -- HIGH confidence (first-party)

---
*Architecture research for: Docker-deployed Next.js multi-tenant app with proxy-based auth*
*Researched: 2026-02-18*
