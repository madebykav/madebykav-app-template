# Phase 2: Docker & Health Probes - Research

**Researched:** 2026-02-25
**Domain:** Docker containerization, health probes, local dev orchestration
**Confidence:** HIGH

## Summary

Phase 2 creates the Docker infrastructure and health probe endpoints needed to go from "clone to running" in one command (`./dev.sh`) and produce a production-ready container image. The spec (APP-TEMPLATE-UPDATE-FINAL.md) provides exact file contents for all six deliverables: Dockerfile, .dockerignore, docker-compose.yml, dev.sh, and two health probe API routes.

The implementation is straightforward because: (1) Next.js `output: 'standalone'` is already configured in `next.config.ts`, (2) the spec provides complete file contents, and (3) no new npm dependencies are needed. The primary technical concerns are: securely passing the GITHUB_TOKEN for private package installation during Docker build (the spec uses plain `pnpm install` but the `.npmrc` needs an auth token), the absence of a `public/` directory (spec's Dockerfile tries to COPY it), and choosing the right Node.js base image version.

**Primary recommendation:** Follow the spec file contents closely, but fix three issues: (1) use BuildKit secret mounts instead of build-args for the GITHUB_TOKEN (addresses the blocker in STATE.md), (2) guard the `COPY public` line since no `public/` directory exists yet, and (3) consider upgrading from `node:20-alpine` to `node:22-alpine` since Node 22 is active LTS through April 2027.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCK-01 | Create multi-stage Dockerfile (base/deps/builder/runner with standalone output, non-root user, HEALTHCHECK) | Verified: official Next.js with-docker example uses identical 3-stage pattern (deps/builder/runner). Standalone output already configured in next.config.ts. Alpine base includes BusyBox wget for HEALTHCHECK. Spec provides exact Dockerfile content. |
| DOCK-02 | Create .dockerignore (exclude node_modules, .next, .git, .env*, *.md, drizzle/) | Straightforward file creation. Spec provides exact content. Must exclude .planning/ as well (not in spec but contains internal planning docs). |
| DOCK-03 | Create docker-compose.yml (local dev postgres on port 5433 with dev profile) | Docker Compose profiles feature is stable. postgres:16-alpine is current stable. Port 5433:5432 mapping avoids system postgres conflicts. Spec provides exact content. |
| DOCK-04 | Create dev.sh script (start postgres, wait for readiness, push schema, run dev server) | pg_isready via docker compose exec is the standard wait pattern. Script is simple bash. Spec provides exact content. Needs chmod +x and .env.local setup check. |
| HLTH-01 | Create liveness probe at /api/health returning {"status":"ok"} | Simple Next.js Route Handler. No dependencies needed. Liveness probes must NOT check external systems (DB, etc.) per Kubernetes best practices -- just return 200 OK. Spec provides exact 3-line implementation. |
| HLTH-02 | Create readiness probe at /api/health/ready (checks DB with SELECT 1, returns 503 if unreachable) | Uses drizzle-orm's `sql` template tag with `db.execute(sql\`SELECT 1\`)`. Returns 503 on failure. Import `sql` from `drizzle-orm` and `db` from `@/lib/db`. Spec provides exact implementation. |
</phase_requirements>

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Docker multi-stage build | BuildKit | Create optimized production image | Official Next.js recommendation; separates deps/build/runtime for minimal image size |
| node:22-alpine | Node 22 LTS | Base Docker image | Active LTS through April 2027; Alpine minimizes image size (~240MB); BusyBox provides wget for HEALTHCHECK |
| postgres:16-alpine | PostgreSQL 16 | Local dev database | Current stable PostgreSQL; Alpine variant is lightweight; matches production parity |
| Docker Compose profiles | Compose v2 | Dev-only service orchestration | `profiles: [dev]` ensures postgres only starts when explicitly requested |
| pnpm (via corepack) | 10.x | Package manager in Docker | Project already uses pnpm; corepack enable is the standard Docker pattern |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| BuildKit secret mounts | Docker BuildKit | Secure token handling during build | When installing private @madebykav/* packages -- avoids leaking GITHUB_TOKEN into image layers |
| pg_isready | PostgreSQL CLI | Database readiness check in dev.sh | Standard way to wait for PostgreSQL to accept connections before schema push |
| drizzle-orm `sql` tag | 0.45.x | Raw SQL execution for health check | Readiness probe uses `db.execute(sql\`SELECT 1\`)` to verify DB connectivity |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node:22-alpine | node:22-slim (Debian) | Slim is ~80MB larger but avoids musl/glibc edge cases. Alpine is fine for this project since no native modules are compiled. |
| node:22-alpine | node:24-slim (latest LTS) | Node 24 is LTS as of Oct 2025 but spec says node:20-alpine. Node 22 is a safe middle ground -- proven stable, active LTS. |
| wget (HEALTHCHECK) | node -e "fetch(...)" | Native fetch avoids tool dependency but is more verbose. wget is included in Alpine BusyBox, simpler syntax. |
| BuildKit secrets | Build-args | Build-args leak into image layers and `docker history`. Secrets are ephemeral and never persisted. |
| docker compose exec pg_isready | wait-for-it.sh script | pg_isready is purpose-built for PostgreSQL readiness checks. Third-party scripts add unnecessary complexity. |

**Installation:**
No new npm packages needed. All Docker and health probe functionality uses existing dependencies:
- `drizzle-orm` (already installed) provides `sql` template tag
- `@/lib/db` (already exists) provides `db` instance

## Architecture Patterns

### Recommended File Structure

```
/ (project root)
├── Dockerfile              # Multi-stage production build
├── .dockerignore           # Exclude build artifacts from context
├── docker-compose.yml      # Dev-only postgres with profile
├── dev.sh                  # One-command dev setup script
└── src/app/api/
    └── health/
        ├── route.ts        # Liveness probe (GET /api/health)
        └── ready/
            └── route.ts    # Readiness probe (GET /api/health/ready)
```

### Pattern 1: Multi-Stage Docker Build for Next.js Standalone

**What:** Four-stage Dockerfile (base -> deps -> builder -> runner) that produces a minimal production image from Next.js standalone output.

**When to use:** Every Next.js app deployed as a Docker container.

**Key stages:**
```dockerfile
# Stage 1: Base -- Node + pnpm via corepack
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 2: Dependencies -- install with frozen lockfile
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=secret,id=GITHUB_TOKEN \
    GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) \
    pnpm install --frozen-lockfile

# Stage 3: Builder -- build the Next.js app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 4: Runner -- minimal production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

Source: [Official Next.js Docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker), adapted for pnpm + BuildKit secrets.

### Pattern 2: Liveness vs. Readiness Probes

**What:** Two separate health endpoints serving different container orchestration needs.

**When to use:** Any containerized app running behind a load balancer or in Kubernetes/Docker Swarm.

**Key principle:**
- **Liveness** (`/api/health`): "Is the process alive?" -- Always returns 200. Must NOT check external dependencies. If this fails, the container gets restarted.
- **Readiness** (`/api/health/ready`): "Can this instance serve traffic?" -- Checks DB connectivity. If this fails, the instance is removed from the load balancer but NOT restarted.

Source: [Node.js Reference Architecture - Health Checks](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/), [Kubernetes probe documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

### Pattern 3: Docker Compose Dev Profile

**What:** A docker-compose.yml where development-only services (postgres) are gated behind a `profiles: [dev]` attribute, so they only start when explicitly requested.

**When to use:** When the compose file should not accidentally start infrastructure services.

**Example:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: app_dev
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    profiles: [dev]

volumes:
  pgdata:
```

Activated with: `docker compose --profile dev up -d`

Source: [Docker Compose Profiles documentation](https://docs.docker.com/compose/how-tos/profiles/)

### Anti-Patterns to Avoid

- **Liveness probe checking the database:** If the DB goes down, the liveness probe fails, Kubernetes restarts the container, which can't fix the DB -- creating a restart loop. Only the readiness probe should check external dependencies.
- **Using `--build-arg` for secrets:** Build args are stored in image layers and visible in `docker history`. Use `--mount=type=secret` instead.
- **Installing devDependencies in the runner stage:** Only the standalone output (server.js + .next/static) should be in the final image. No node_modules needed in runner.
- **Running as root in production:** Always create a non-root user (nextjs:nodejs) and switch with `USER` directive before CMD.
- **Hardcoding pnpm version in Dockerfile:** Use `corepack enable` + `corepack prepare pnpm@latest` rather than `RUN npm install -g pnpm@10.28.1`. Corepack handles version management.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wait for postgres | Custom TCP socket checker | `pg_isready` via docker compose exec | Purpose-built for PostgreSQL, handles auth, timeouts, and connection protocols correctly |
| Docker health check | Custom health check script | BusyBox `wget` in HEALTHCHECK directive | Already included in Alpine, no extra dependencies |
| Package manager install | `RUN npm install -g pnpm` | `corepack enable && corepack prepare pnpm@latest` | Corepack is the Node.js-blessed way to manage package managers |
| Secret passing in Docker | Build-args or COPY .npmrc | BuildKit `--mount=type=secret` | Secrets never persist in image layers |
| DB connectivity check | Custom pg connection code | `db.execute(sql\`SELECT 1\`)` via drizzle-orm | Already have drizzle-orm configured; no new dependencies |

**Key insight:** Every piece of this phase uses existing tools and patterns. No custom libraries or complex orchestration needed.

## Common Pitfalls

### Pitfall 1: GITHUB_TOKEN Leaking into Docker Image Layers

**What goes wrong:** The spec's Dockerfile uses plain `pnpm install --frozen-lockfile` but the `.npmrc` references `https://npm.pkg.github.com` which requires authentication. If you pass the token via `--build-arg` or write it to `.npmrc` during build, it persists in image layers.

**Why it happens:** Docker layers are immutable. Even if you delete a file in a later layer, the previous layer still contains it. `docker history` and layer inspection tools can extract the token.

**How to avoid:** Use BuildKit secret mounts:
```dockerfile
RUN --mount=type=secret,id=GITHUB_TOKEN \
    GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) \
    pnpm install --frozen-lockfile
```
Build with: `docker build --secret id=GITHUB_TOKEN .`

**Warning signs:** Any `ARG NPM_TOKEN` or `COPY .npmrc` followed by `RUN rm .npmrc` in the Dockerfile.

### Pitfall 2: Missing public/ Directory in Dockerfile COPY

**What goes wrong:** The spec's Dockerfile includes `COPY --from=builder /app/public ./public` but the project has no `public/` directory. Docker COPY fails if the source path doesn't exist.

**Why it happens:** The spec was written generically. This particular template hasn't added a public directory yet.

**How to avoid:** Either (a) create an empty `public/` directory with a `.gitkeep` file, or (b) remove the COPY line from the Dockerfile. Option (a) is safer since apps will likely add favicon/images later.

**Warning signs:** `docker build` fails with "COPY failed: file not found in build context."

### Pitfall 3: .npmrc Token Resolution in Docker

**What goes wrong:** The project `.npmrc` contains `@madebykav:registry=https://npm.pkg.github.com` but does NOT contain the auth token line. The auth token is typically in the user's `~/.npmrc`. During Docker build, the user's `~/.npmrc` is not available.

**Why it happens:** The project `.npmrc` only sets the registry. Auth comes from user-level config (`//npm.pkg.github.com/:_authToken=...`).

**How to avoid:** During the Docker build, create a temporary `.npmrc` that combines the registry setting with the auth token from the BuildKit secret. Or append the auth line in the RUN command:
```dockerfile
RUN --mount=type=secret,id=GITHUB_TOKEN \
    echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/GITHUB_TOKEN)" >> .npmrc && \
    pnpm install --frozen-lockfile && \
    sed -i '/authToken/d' .npmrc
```

**Warning signs:** `pnpm install` fails with 401 Unauthorized for `@madebykav/*` packages during Docker build.

### Pitfall 4: dev.sh Assumes .env.local Exists with Correct DATABASE_URL

**What goes wrong:** `dev.sh` runs `pnpm db:push` which reads `DATABASE_URL` from environment. If `.env.local` doesn't exist or has the wrong URL (e.g., pointing to remote DB instead of localhost:5433), schema push goes to the wrong database.

**Why it happens:** New developers clone the repo but forget to copy `.env.example` to `.env.local` and update the DATABASE_URL.

**How to avoid:** Add a check in `dev.sh` that either (a) verifies `.env.local` exists, or (b) automatically creates it from `.env.example` if missing. The `.env.example` already has the correct local dev URL (`postgresql://devuser:devpassword@localhost:5433/app_dev`).

**Warning signs:** Schema push errors about connection refused or pushes to wrong database.

### Pitfall 5: Docker Compose Volume Persistence Surprises

**What goes wrong:** Postgres data persists across `docker compose down` because named volumes are not removed by default. A schema change doesn't take effect because old data/schema persists.

**Why it happens:** Named volumes (`pgdata:/var/lib/postgresql/data`) survive `docker compose down`. Only `docker compose down -v` removes them.

**How to avoid:** Document that `docker compose down -v` clears the database. Consider mentioning this in dev.sh output or adding a `dev-clean.sh` script.

**Warning signs:** Schema push says "nothing to change" when you've modified schema.ts.

### Pitfall 6: Port 5433 Conflict

**What goes wrong:** Another service or previous Docker container is already using port 5433.

**Why it happens:** Port 5433 was chosen to avoid conflict with system postgres on 5432, but developers may have other services.

**How to avoid:** dev.sh should handle startup failures gracefully and suggest checking for port conflicts.

**Warning signs:** `docker compose up` fails with "port is already allocated."

## Code Examples

Verified patterns from the spec and official sources:

### Liveness Probe (HLTH-01)

```typescript
// src/app/api/health/route.ts
// Source: APP-TEMPLATE-UPDATE-FINAL.md section 10

export async function GET() {
  return Response.json({ status: 'ok' })
}
```

### Readiness Probe (HLTH-02)

```typescript
// src/app/api/health/ready/route.ts
// Source: APP-TEMPLATE-UPDATE-FINAL.md section 11

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ready' })
  } catch {
    return Response.json({ status: 'not ready' }, { status: 503 })
  }
}
```

### dev.sh Script (DOCK-04)

```bash
#!/usr/bin/env bash
# Source: APP-TEMPLATE-UPDATE-FINAL.md section 19
set -e

echo "Starting development environment..."

# Start local postgres
docker compose --profile dev up -d
echo "Waiting for PostgreSQL..."
until docker compose exec postgres pg_isready -U devuser -d app_dev > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL ready."

# Push schema (creates tables + RLS policies)
pnpm db:push

echo "Starting Next.js dev server..."
pnpm dev
```

### BuildKit Secret Mount for pnpm install

```dockerfile
# Deps stage -- securely install with private registry auth
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=secret,id=GITHUB_TOKEN \
    echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/GITHUB_TOKEN)" >> .npmrc && \
    pnpm install --frozen-lockfile && \
    sed -i '/authToken/d' .npmrc
```

Source: [Docker BuildKit secrets documentation](https://docs.docker.com/build/building/secrets/), [Secure Docker NPM patterns](https://muhannad.io/post/2024/04/secure-docker-build-secrets/)

### Docker Build Command

```bash
# Local build with secret
docker build --secret id=GITHUB_TOKEN -t my-app .

# Or if GITHUB_TOKEN is already exported
export GITHUB_TOKEN=ghp_xxx
docker build --secret id=GITHUB_TOKEN -t my-app .
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npm install -g pnpm` in Docker | `corepack enable && corepack prepare pnpm@latest` | Node 16+ (2021) | Corepack is the official Node.js package manager manager; no global install needed |
| `--build-arg NPM_TOKEN=xxx` | `--mount=type=secret,id=GITHUB_TOKEN` | Docker BuildKit (2018+, mainstream 2023+) | Secrets never persist in image layers; resolves the blocker in STATE.md |
| Manual `wait-for-it.sh` scripts | `docker compose exec ... pg_isready` + `depends_on: condition: service_healthy` | Docker Compose v2 (2022+) | Built-in health check and dependency management eliminates third-party scripts |
| `docker-compose.yml` version field | No version field needed | Compose v2 (2022+) | The `version` key is obsolete in modern Docker Compose |
| node:20-alpine base | node:22-alpine (or node:24-alpine) | Oct 2024 / Oct 2025 | Node 22 is active LTS through Apr 2027; Node 20 enters maintenance Apr 2026 |

**Deprecated/outdated:**
- `version: "3.x"` in docker-compose.yml: No longer needed, Compose v2 auto-detects
- `corepack prepare` without `--activate`: Redundant on Node 22+ where `corepack enable` suffices for simple cases
- `COPY .npmrc` with embedded tokens: Security risk; use BuildKit secrets instead

## Open Questions

1. **Node base image version: 20, 22, or 24?**
   - What we know: Spec says `node:20-alpine`. Node 22 is active LTS (recommended). Node 24 is latest LTS but newer.
   - What's unclear: Whether the spec's `node:20-alpine` is a deliberate choice or just a default.
   - Recommendation: Use `node:22-alpine`. It's the active LTS, proven stable, and will be supported through April 2027. The spec's `node:20-alpine` is likely just a template default -- Node 20 enters maintenance in April 2026. Node 24 is viable but unnecessarily bleeding edge for a template. **Confidence: HIGH** -- standard recommendation per Node.js release schedule.

2. **BuildKit secrets vs. spec's plain pnpm install**
   - What we know: Spec's Dockerfile does plain `pnpm install --frozen-lockfile`. STATE.md blocker says "NPM_TOKEN in Docker build-args leaks into image layers. Consider BuildKit secrets in Phase 2."
   - What's unclear: Whether the .npmrc auth token issue should be solved now or deferred. REQUIREMENTS.md lists SEC-02 as v2 (deferred).
   - Recommendation: Implement BuildKit secrets NOW in Phase 2, even though SEC-02 is listed as v2. The STATE.md explicitly flags this as a Phase 2 concern. Without it, `docker build` simply won't work (no auth for private packages). This is a functional necessity, not just a security enhancement. **Confidence: HIGH** -- docker build will fail without auth token resolution.

3. **Missing public/ directory**
   - What we know: Spec Dockerfile has `COPY --from=builder /app/public ./public`. Project has no `public/` directory.
   - What's unclear: Whether to create an empty public/ or skip the COPY line.
   - Recommendation: Create `public/.gitkeep` so the COPY works and future static assets have a home. This is the conventional Next.js project structure. **Confidence: HIGH** -- trivial fix, follows Next.js convention.

4. **dev.sh .env.local bootstrapping**
   - What we know: dev.sh needs DATABASE_URL to point to localhost:5433. .env.example has the correct value.
   - What's unclear: Whether dev.sh should auto-create .env.local from .env.example.
   - Recommendation: Add a check at the top of dev.sh: if .env.local doesn't exist, copy from .env.example and print a message. This makes the "clone to running" experience truly one-command. **Confidence: MEDIUM** -- good DX, but the planner should decide scope.

## Sources

### Primary (HIGH confidence)
- [Official Next.js Docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker) - Multi-stage Dockerfile pattern with standalone output
- [pnpm Docker documentation](https://pnpm.io/docker) - Corepack setup, cache mounts, multi-stage patterns
- [Docker BuildKit secrets documentation](https://docs.docker.com/build/building/secrets/) - Secret mount syntax and usage
- [Docker Compose profiles documentation](https://docs.docker.com/compose/how-tos/profiles/) - Profile activation and service gating
- APP-TEMPLATE-UPDATE-FINAL.md (project spec) - Exact file contents for all deliverables

### Secondary (MEDIUM confidence)
- [Node.js Reference Architecture - Health Checks](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/) - Liveness vs. readiness probe patterns
- [Secure Docker build secrets for NPM](https://muhannad.io/post/2024/04/secure-docker-build-secrets/) - BuildKit secret mount pattern for private registries
- [Depot.dev optimal pnpm Dockerfile](https://depot.dev/docs/container-builds/how-to-guides/optimal-dockerfiles/node-pnpm-dockerfile) - Optimized multi-stage build with pnpm
- [Node.js endoflife.date](https://endoflife.date/nodejs) - Node.js LTS schedule verification

### Tertiary (LOW confidence)
- Community discussions on PostgreSQL Docker compose port mapping and health checks -- patterns are well-established but individual configurations vary

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Docker multi-stage builds for Next.js are well-documented and stable; official examples exist
- Architecture: HIGH - File structure and patterns come directly from the project spec with official Docker/Next.js backing
- Pitfalls: HIGH - Token leakage, missing public/, and .npmrc auth are verified real issues based on codebase inspection
- Health probes: HIGH - Liveness/readiness pattern is industry standard; drizzle-orm sql tag is documented

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable domain, patterns unlikely to change)
