# MadeByKav App Template v2

## What This Is

The official starter template for building apps on the MadeByKav platform. Developers clone this repo to scaffold a tenant-isolated Next.js application with authentication, database access, and shared UI components already wired up. This update brings the template to v2: pinned SDK versions, declarative RLS, Docker-first deployment, local dev automation, and health probes.

## Core Value

A developer can go from `git clone` to a running, tenant-isolated app in one command (`./dev.sh`), and from `git push` to a deployed Docker container via CI/CD — with correct auth, RLS, and health probes out of the box.

## Requirements

### Validated

<!-- Existing capabilities confirmed in codebase map -->

- ✓ Next.js App Router with Server Components — existing
- ✓ TypeScript throughout — existing
- ✓ @madebykav/auth SDK for authentication context — existing
- ✓ @madebykav/db SDK for tenant-isolated queries via withTenant() — existing
- ✓ @madebykav/ui SDK for shared UI components (Button, Card, Input) — existing
- ✓ Drizzle ORM with PostgreSQL — existing
- ✓ Example CRUD API (GET/POST /api/example) — existing
- ✓ Dashboard page with auth context display — existing
- ✓ Tailwind CSS styling — existing
- ✓ pnpm package management with GitHub Packages registry — existing

### Active

<!-- v2 changes from APP-TEMPLATE-UPDATE-FINAL.md spec -->

- [ ] Update drizzle-orm ^0.38.4 to ^0.45.0 (required by @madebykav/db peer dep)
- [ ] Pin SDK versions: @madebykav/auth ^0.2.0, @madebykav/db ^0.1.0, @madebykav/ui ^0.1.2
- [ ] Remove @madebykav/ai from template (optional, devs add when needed)
- [ ] Add `output: 'standalone'` to next.config.ts for Docker builds
- [ ] Declarative RLS with pgPolicy() + createTenantPolicy() in schema (replaces manual SQL)
- [ ] Remove SDK re-exports from db/index.ts (import directly from @madebykav/db)
- [ ] Remove auth call from root layout (currently forces every page dynamic)
- [ ] Update page.tsx to new AuthContext shape (auth.name, auth.email, auth.role, auth.tenantSlug)
- [ ] Add liveness probe: GET /api/health returns {"status":"ok"}
- [ ] Add readiness probe: GET /api/health/ready returns {"status":"ready"} or 503
- [ ] Add logout server action (redirects to platform /logout)
- [ ] Add @source directive to globals.css for Tailwind v4 class scanning
- [ ] Update .env.example with clearer documentation and dev defaults
- [ ] Create Dockerfile with multi-stage build (deps → build → standalone runner)
- [ ] Create .dockerignore
- [ ] Create docker-compose.yml for local dev postgres (port 5433, dev profile)
- [ ] Create dev.sh script (one-command: postgres + schema push + dev server)
- [ ] Create GitHub Actions CI/CD workflow (build and push Docker image to GHCR)
- [ ] Delete tailwind.config.ts (Tailwind v4 uses CSS-based config)
- [ ] Rewrite CLAUDE.md with updated SDK docs, patterns, and commands
- [ ] Rewrite README.md with quick start, deployment, and project structure
- [ ] Generate Sonner/Toast brief for platform dev (@madebykav/ui SDK addition)

### Out of Scope

- Adding new SDK packages — template uses existing platform SDKs only
- Testing framework setup — not in spec, devs add per-app
- @madebykav/ai integration — removed from template, devs add when needed
- Backend proxy pattern — documented in CLAUDE.md but not implemented in template
- Upgrading Next.js to v16 — decision to stay on v15 per spec decisions log

## Context

- **Architecture:** Apps run as Docker containers behind Caddy reverse proxy. Auth is handled at proxy layer via `forward_auth` to auth-validator. Apps receive 6 trusted identity headers (X-Tenant-Id, X-User-Id, X-User-Role, X-User-Email, X-Tenant-Slug, X-User-Name).
- **Database model changed:** Each app now owns its own PostgreSQL database (not shared platform DB). Multiple tenants still share the same app, so RLS via @madebykav/db is still needed.
- **Auth SDK v0.2.0 breaking change:** AuthContext type changed — no more optional fields, no `appSlug`. Returns `null` if not authenticated (not an object with null fields).
- **Tailwind v4:** CSS-based config replaces tailwind.config.ts. Needs `@source` directive for SDK component class scanning.
- **Existing brief:** APP-TEMPLATE-UPDATE-FINAL.md contains exact file contents for every change — implementation follows spec verbatim.
- **UI SDK gap:** Content Generator app identified Sonner/Toast as missing from @madebykav/ui. Brief to be generated for platform dev.

## Constraints

- **Spec fidelity**: Follow APP-TEMPLATE-UPDATE-FINAL.md exactly — exact file contents as specified
- **SDK dependency**: @madebykav/auth ^0.2.0 must be published (assumed available via GitHub Packages)
- **Drizzle version**: ^0.45.0 required by @madebykav/db peer dep — install will fail without this
- **Docker**: Dockerfile requires `output: 'standalone'` in next.config.ts
- **Port 5433**: Local dev postgres uses 5433 to avoid conflicts with system postgres on 5432

## Key Decisions

<!-- From APP-TEMPLATE-UPDATE-FINAL.md decisions log -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep @madebykav/auth SDK (not inline header reader) | SDK provides typed context, safe standalone fallback, centralizes header contract | — Pending |
| Keep @madebykav/db SDK with app-owned DB | Apps own their own PostgreSQL — self-contained. SDK still needed for RLS (multiple tenants per app) | — Pending |
| Stay on Next.js 15 (not 16) | No compelling reason to bump major version. Auth SDK supports ^14-^16. Devs upgrade when ready | — Pending |
| Cookie validation for dev fallback (not hardcoded UUIDs) | Hardcoded UUIDs are a security risk if leaked to production. SDK validates real session cookie | — Pending |
| docker-compose for local dev DB | dev.sh spins up local postgres on port 5433, pushes schema, starts Next.js. Single command from clone to running | — Pending |
| Remove @madebykav/ai from template | Optional — not every app needs it. Devs add when needed | — Pending |
| Declarative RLS via pgPolicy() | Replaces manual SQL execution of create_tenant_policy(). Schema is the source of truth | — Pending |

---
*Last updated: 2026-02-18 after initialization*
