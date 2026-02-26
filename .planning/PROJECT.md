# MadeByKav App Template v2

## What This Is

The official starter template for building apps on the MadeByKav platform. Developers clone this repo to scaffold a tenant-isolated Next.js application with authentication, database access, and shared UI components already wired up. Ships with Docker-first deployment, one-command local dev setup, declarative RLS, CI/CD pipeline, and health probes out of the box.

## Core Value

A developer can go from `git clone` to a running, tenant-isolated app in one command (`./dev.sh`), and from `git push` to a deployed Docker container via CI/CD — with correct auth, RLS, and health probes out of the box.

## Requirements

### Validated

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
- ✓ drizzle-orm ^0.45.0 with pinned SDK versions (auth@0.2.0, db@0.1.0, ui@0.1.2) — v0.2
- ✓ @madebykav/ai removed from template dependencies — v0.2
- ✓ Standalone output in next.config.ts for Docker builds — v0.2
- ✓ Declarative RLS with pgPolicy() + createTenantPolicy() — v0.2
- ✓ Direct SDK imports (no re-exports from db/index.ts) — v0.2
- ✓ Root layout free of auth calls (no forced dynamic) — v0.2
- ✓ AuthContext v0.2.0 shape (null check, auth.name/email/role/tenantSlug) — v0.2
- ✓ Liveness probe /api/health and readiness probe /api/health/ready — v0.2
- ✓ Logout server action (redirects to platform /logout) — v0.2
- ✓ Tailwind v4 CSS-first config with @source SDK scanning — v0.2
- ✓ .env.example with dev defaults and clear documentation — v0.2
- ✓ Multi-stage Dockerfile with BuildKit secrets — v0.2
- ✓ docker-compose.yml for local dev postgres (port 5433) — v0.2
- ✓ dev.sh one-command setup (postgres + schema push + dev server) — v0.2
- ✓ GitHub Actions CI/CD (docker-publish.yml → GHCR) — v0.2
- ✓ CLAUDE.md rewritten with v2 patterns, architecture, and commands — v0.2
- ✓ README.md with quick start, deployment, SDK table — v0.2
- ✓ Sonner/Toast specification brief for @madebykav/ui SDK — v0.2

### Active

- [ ] Custom error boundary page (error.tsx)
- [ ] Custom not-found page (not-found.tsx)
- [ ] Loading UI example (loading.tsx) with Suspense/streaming
- [ ] Example server action with form (data mutation pattern)
- [ ] Content Security Policy headers via next.config.ts
- [ ] Logout button UI in dashboard (wires existing server action)

### Out of Scope

- Testing framework setup — not in spec, devs add per-app
- @madebykav/ai integration — removed from template, devs add when needed
- Backend proxy pattern — documented in CLAUDE.md but not implemented in template
- Upgrading Next.js to v16 — decision to stay on v15 per spec decisions log
- Monorepo/workspace (Turborepo) — template is for single app
- Internationalization (i18n) — most apps start single-language
- Real-time features (WebSockets, SSE) — add when app needs it
- State management library — RSC reduces need for client state
- Database migration files — template uses db:push for dev

## Context

- **Architecture:** Apps run as Docker containers behind Caddy reverse proxy. Auth is handled at proxy layer via `forward_auth` to auth-validator. Apps receive 6 trusted identity headers.
- **Database:** Each app owns its own PostgreSQL database. Multiple tenants share the same app; RLS via @madebykav/db ensures data isolation.
- **Auth SDK v0.2.0:** AuthContext returns `null` if not authenticated (not object with null fields). No more optional fields, no `appSlug`.
- **Tailwind v4:** CSS-based config with `@source` directive for SDK component class scanning. No tailwind.config.ts.
- **Docker deployment:** Multi-stage Dockerfile with BuildKit secrets for private GitHub Packages auth. Standalone output for minimal image size.
- **CI/CD:** GitHub Actions workflow pushes Docker images to GHCR on push to main (SHA + latest tags).
- **Shipped v0.2:** 359 LOC TypeScript/CSS app code, 4 phases, 8 plans, 27 requirements all satisfied.
- **Tech debt from v0.2:** Logout action has no UI consumer, minor doc accuracy items (see milestones/v0.2-MILESTONE-AUDIT.md).
- **UI SDK gap:** Sonner/Toast specification brief generated for platform dev to add to @madebykav/ui.

## Constraints

- **SDK dependency**: @madebykav/auth ^0.2.0, @madebykav/db ^0.1.0, @madebykav/ui ^0.1.2 via GitHub Packages
- **Drizzle version**: ^0.45.0 required by @madebykav/db peer dep
- **Docker**: Dockerfile requires `output: 'standalone'` in next.config.ts
- **Port 5433**: Local dev postgres uses 5433 to avoid conflicts with system postgres on 5432

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep @madebykav/auth SDK (not inline header reader) | SDK provides typed context, safe standalone fallback, centralizes header contract | ✓ Good — clean auth pattern across all pages |
| Keep @madebykav/db SDK with app-owned DB | Apps own their own PostgreSQL — self-contained. SDK still needed for RLS (multiple tenants per app) | ✓ Good — withTenant() enforces isolation |
| Stay on Next.js 15 (not 16) | No compelling reason to bump major version. Auth SDK supports ^14-^16. Devs upgrade when ready | ✓ Good — stable, no issues |
| Cookie validation for dev fallback (not hardcoded UUIDs) | Hardcoded UUIDs are a security risk if leaked to production. SDK validates real session cookie | ✓ Good — secure by default |
| docker-compose for local dev DB | dev.sh spins up local postgres on port 5433, pushes schema, starts Next.js. Single command from clone to running | ✓ Good — delivers core value |
| Remove @madebykav/ai from template | Optional — not every app needs it. Devs add when needed | ✓ Good — cleaner template |
| Declarative RLS via pgPolicy() | Replaces manual SQL execution of create_tenant_policy(). Schema is the source of truth | ✓ Good — single source of truth |
| BuildKit secret mount for GITHUB_TOKEN | Avoids token leaking into Docker image layers (vs build-args) | ✓ Good — secure builds |
| Synchronous root layout (no auth call) | Pages call getAuthContext() individually — enables static optimization | ✓ Good — better performance |
| Liveness probe skips DB check | Prevents restart loops when DB is temporarily down | ✓ Good — correct orchestration pattern |
| Sonner as direct dep of @madebykav/ui | Not peer dep — simpler for template consumers | — Pending (spec brief only) |

---
*Last updated: 2026-02-26 after v0.2 milestone*
