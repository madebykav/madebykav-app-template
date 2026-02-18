# Project Research Summary

**Project:** MadeByKav App Template v2
**Domain:** Platform-specific Next.js app template with Docker deployment, declarative RLS, and CI/CD
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

This is a v1-to-v2 update of a platform-specific Next.js starter template. The template scaffolds tenant-isolated applications that run as Docker containers behind a Caddy reverse proxy with forward-auth. Experts build this type of system by separating concerns cleanly: authentication at the proxy layer (zero auth code in apps), tenant isolation at the database layer (PostgreSQL RLS), and containerization via multi-stage Docker builds with standalone Next.js output. The stack is decided -- Next.js 15, React 19, Drizzle ORM 0.45, Tailwind v4, pnpm -- so research focused on validating versions, migration patterns, and integration risks rather than technology selection.

The recommended approach is to execute this update in four tightly-scoped phases: (1) foundation updates (package versions, schema migration to declarative RLS, Tailwind v4 CSS config), (2) Docker infrastructure (Dockerfile, docker-compose, dev.sh, health probes), (3) CI/CD pipeline (GitHub Actions workflow for GHCR), and (4) app code updates and documentation (page/layout rewrites, CLAUDE.md, README.md). This ordering follows the build dependency chain discovered in architecture research -- later phases depend on artifacts from earlier ones.

The primary risks are: a known Drizzle ORM bug where `db:push` creates empty RLS policy USING clauses (silently defeating tenant isolation), the auth SDK v0.2.0 breaking change that alters the AuthContext type shape, and NPM token handling in Docker builds where the spec uses build-args that leak tokens into image layer history. All three have clear mitigations documented in the pitfalls research. The overall confidence is HIGH because this is a well-constrained update with an existing spec (APP-TEMPLATE-UPDATE-FINAL.md), verified dependency versions, and well-documented patterns for every component.

## Key Findings

### Recommended Stack

The stack is pre-decided and validated. All versions were verified against npm registry on 2026-02-18. The key version bump is drizzle-orm from ^0.38.4 to ^0.45.0 (required by `@madebykav/db` peer dependency for declarative RLS via `pgPolicy()`). Tailwind CSS v4 is already in devDependencies but requires migration from JS config to CSS-based `@import "tailwindcss"` + `@source` + `@theme` directives.

**Core technologies:**
- **Next.js ^15.1.6**: App framework with App Router, RSC, Server Actions. Stay on 15 (not 16) for template stability.
- **drizzle-orm ^0.45.0**: ORM with schema-defined RLS via `pgPolicy()`. Critical version bump from 0.38.
- **Tailwind CSS ^4.0.6**: Utility CSS with CSS-based config. Delete `tailwind.config.ts`, use `@import "tailwindcss"`.
- **Docker (multi-stage, node:20-alpine)**: Production container builds. `output: 'standalone'` yields ~130-180MB images. Consider bumping to node:22-alpine for longer LTS support.
- **GitHub Actions + GHCR**: CI/CD pipeline. docker/build-push-action@v6, docker/login-action@v3, docker/metadata-action@v5.
- **SDK packages pinned**: auth ^0.2.0, db ^0.1.0, ui ^0.1.2. Remove @madebykav/ai from defaults.

**Critical version constraint:** `@madebykav/db@^0.1.0` requires `drizzle-orm@^0.45.0` as peer dependency. Install will fail with the current drizzle-orm 0.38.x.

See [STACK.md](./STACK.md) for full version compatibility matrix and migration details.

### Expected Features

All v2 features are P1 (must-have). This is not a feature-selection exercise -- the spec defines exactly what ships. The template competes with $169-$299 paid SaaS starters (ShipFast, Supastarter) on multi-tenancy and auth, while adding containerization features none of them provide.

**Must have (table stakes):**
- Docker multi-stage build + `.dockerignore` + `output: 'standalone'`
- Health probe endpoints (liveness at `/api/health`, readiness at `/api/health/ready`)
- Local dev database via docker-compose (port 5433, dev profile)
- One-command dev setup (`dev.sh`: postgres + schema push + dev server)
- CI/CD pipeline (GitHub Actions to build and push Docker image to GHCR)
- Declarative RLS in schema (`pgPolicy()` + `createTenantPolicy()`)
- Tailwind v4 CSS-first config (delete `tailwind.config.ts`, add `@source` directive)
- Pinned SDK versions (no more floating `latest`)
- Updated AuthContext usage for v0.2.0 breaking change
- Logout server action
- CLAUDE.md and README.md full rewrites

**Should have (differentiators):**
- Platform-aware auth context (zero-config, no API keys, no OAuth setup)
- Automatic tenant isolation via RLS (enforced at database level, not app code)
- App-owns-database architecture (independent scaling, no cross-app failures)
- `@source` directive for shared UI class scanning (platform-specific knowledge)
- HEALTHCHECK in Dockerfile (goes beyond official Next.js Docker example)

**Defer (v2.x/v3+):**
- Error boundary pages, loading UI, server action form examples (v2.x)
- Multi-environment Docker compose, cache handler, deploymentId, instrumentation (v3+)
- Testing framework setup, i18n, state management, email (anti-features -- add per-app)

See [FEATURES.md](./FEATURES.md) for full prioritization matrix and competitor analysis.

### Architecture Approach

The architecture is a three-layer system: Caddy reverse proxy (TLS + auth delegation via forward_auth) -> Next.js standalone container (business logic, SSR, API routes) -> app-owned PostgreSQL (RLS-enforced tenant isolation). In production, the app never touches sessions -- identity arrives as 6 trusted HTTP headers injected by Caddy after the auth-validator confirms the session. In local dev, the SDK falls back to direct cookie validation since there is no proxy. The build dependency chain is linear: next.config.ts (standalone) -> schema + DB connection -> health probes -> Dockerfile -> CI/CD. App code updates can be parallelized alongside Docker infrastructure.

**Major components:**
1. **Caddy Reverse Proxy** -- TLS termination, subdomain routing, forward_auth delegation, header anti-spoofing
2. **App Container (Next.js standalone)** -- Business logic, SSR, API routes, health probes. Runs as non-root user (UID 1001) on port 3000
3. **App-Owned PostgreSQL** -- Persistent storage with RLS. One database per app, multi-tenant within. Declarative policies via `pgPolicy()` in Drizzle schema
4. **CI/CD Pipeline** -- GitHub Actions builds Docker image on push to main, tags with SHA + latest, pushes to GHCR
5. **Local Dev Stack** -- docker-compose for PostgreSQL (port 5433, dev profile), dev.sh for one-command bootstrap

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system diagrams, data flows, and build order analysis.

### Critical Pitfalls

The top 5 pitfalls that must be actively prevented during implementation:

1. **Dockerfile missing NPM_TOKEN for private packages** -- The Dockerfile needs authentication to install `@madebykav/*` packages from GitHub Packages. The spec uses build-args (which leak tokens into image layer history). Use Docker BuildKit secrets (`--mount=type=secret`) instead, or at minimum declare `ARG NPM_TOKEN` and clean up after install. Must be caught during Dockerfile authoring, not after first CI failure.

2. **`drizzle-kit push` creates empty RLS USING clauses** -- Known bug (GitHub issue #3504, fixed-in-beta but uncertain for 0.45 stable). After every `db:push`, verify policies via `pg_policy` system catalog. For production, use `generate` + `migrate` workflow instead of `push`. This is a silent tenant isolation failure -- the policy exists but permits all access.

3. **Auth SDK v0.2.0 type mismatch** -- AuthContext shape changed fundamentally. `getAuthContext()` now returns `AuthContext | null` (not an object with optional fields). Fields renamed/added: `appSlug` removed, `name`/`email`/`role`/`tenantSlug` added. Must update all usages atomically. Remove `getAuthContext()` from root layout (forces all pages dynamic).

4. **Tailwind v4 @source directive missing for node_modules** -- Tailwind v4 ignores `.gitignore`'d paths (including `node_modules`) by default. Without `@source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}"` in `globals.css`, shared UI component styles are silently purged. Build succeeds but components render unstyled.

5. **Standalone output missing public/ and .next/static/ in Docker** -- `output: 'standalone'` intentionally excludes these directories. The Dockerfile must explicitly COPY them. If forgotten, all static assets 404 and the app renders as a blank page.

See [PITFALLS.md](./PITFALLS.md) for full recovery strategies, integration gotchas, and phase-to-pitfall mapping.

## Implications for Roadmap

Based on the build dependency chain from architecture research, feature dependencies from features research, and pitfall-to-phase mapping from pitfalls research, the following phase structure is recommended:

### Phase 1: Foundation Updates (Dependencies, Schema, Tailwind)

**Rationale:** Everything else depends on correct package versions, the updated schema with declarative RLS, and the Tailwind v4 CSS config. This is the foundation layer -- Docker, CI/CD, and app code updates all build on top of these changes.

**Delivers:** Updated `package.json` with pinned SDK versions and drizzle-orm ^0.45.0; `schema.ts` with `pgPolicy()` + `createTenantPolicy()`; `globals.css` with `@import "tailwindcss"` + `@source` directive; deleted `tailwind.config.ts`; updated `next.config.ts` with `output: 'standalone'`; updated `drizzle.config.ts`; cleaned `db/index.ts` (remove SDK re-exports); `.env.example` with documentation.

**Addresses features:** SDK version updates, declarative RLS, Tailwind v4 migration, standalone output, .env.example, remove @madebykav/ai.

**Avoids pitfalls:** Drizzle pgTable third-arg syntax (use array, not object); Tailwind @source for node_modules; import path breakage from removing db/index.ts re-exports.

### Phase 2: Docker Infrastructure

**Rationale:** The Dockerfile depends on `output: 'standalone'` (Phase 1) and health probe endpoints. Docker-compose depends on the database schema being defined. dev.sh depends on docker-compose. This phase creates the complete local dev and production container story.

**Delivers:** Multi-stage Dockerfile (deps -> builder -> runner); `.dockerignore`; `docker-compose.yml` with dev profile (PostgreSQL on port 5433); `dev.sh` one-command bootstrap; health probe endpoints (`/api/health` liveness, `/api/health/ready` readiness with DB check).

**Addresses features:** Docker multi-stage build, .dockerignore, health probes, local dev database, one-command dev setup, non-root Docker user, HEALTHCHECK directive.

**Avoids pitfalls:** NPM_TOKEN injection (use BuildKit secrets or at minimum clean up after install); standalone missing public/.next/static (explicit COPY commands); corepack pnpm version pinning (pin via packageManager field); HEALTHCHECK wget on Alpine (stick with Alpine base).

### Phase 3: CI/CD Pipeline

**Rationale:** The GitHub Actions workflow depends on the Dockerfile (Phase 2) existing and working. This is a standalone phase with no downstream dependents except deployment.

**Delivers:** `.github/workflows/docker-publish.yml` -- checkout, GHCR login, metadata extraction (SHA + latest tags), Docker build+push with NPM_TOKEN secret handling.

**Addresses features:** CI/CD pipeline, GHCR image publishing.

**Avoids pitfalls:** NPM_TOKEN leaking in build args (prefer secret-files in build-push-action); missing packages:write permission on GITHUB_TOKEN.

### Phase 4: App Code and Documentation

**Rationale:** App code updates (layout.tsx, page.tsx, API routes) depend on the auth SDK changes from Phase 1. Documentation (CLAUDE.md, README.md) must reflect all patterns established in Phases 1-3. Writing docs before features are finalized risks inconsistency -- CLAUDE.md should be the last artifact written.

**Delivers:** Updated `layout.tsx` (remove auth call from root layout); updated `page.tsx` (new AuthContext shape, display new fields); logout server action; rewritten `CLAUDE.md` (comprehensive AI-assisted dev context); rewritten `README.md` (quick start, deployment, project structure).

**Addresses features:** Updated AuthContext usage, logout action, CLAUDE.md rewrite, README.md rewrite, updated page.tsx/layout.tsx.

**Avoids pitfalls:** Auth SDK silent type mismatches (update all usages atomically, zero `any` casts); getAuthContext() in root layout (remove it, call per-page).

### Phase Ordering Rationale

- **Phase 1 before 2:** The Dockerfile requires `output: 'standalone'` and health probes require the DB connection module. Schema must exist before docker-compose is useful.
- **Phase 2 before 3:** CI/CD builds the Docker image, so the Dockerfile must exist first.
- **Phase 3 before 4:** Not strictly required (could be parallel), but having CI/CD working before final app code changes means every subsequent change can be validated by the pipeline.
- **Phase 4 last:** Documentation depends on everything else being finalized. The CLAUDE.md rewrite must reflect the final state of auth patterns, RLS patterns, Docker commands, and project structure.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Schema/RLS):** The `drizzle-kit push` RLS bug needs validation. After implementing `pgPolicy()`, the `pg_policy` catalog must be queried to confirm USING clauses are populated. If they are empty, the team must switch to `generate` + `migrate` workflow, which changes the dev.sh script in Phase 2.
- **Phase 2 (Docker):** NPM_TOKEN injection strategy needs a final decision -- build-args (simple but insecure) vs BuildKit secrets (secure but more complex Dockerfile). The spec uses build-args; research recommends secrets.

Phases with standard patterns (skip research-phase):
- **Phase 3 (CI/CD):** Well-documented GitHub Actions Docker workflow. Official docker/build-push-action docs cover everything needed.
- **Phase 4 (App Code/Docs):** Standard Next.js patterns. Auth SDK changes are fully specified in the project spec.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry on 2026-02-18. Compatibility matrix validated. No ambiguity. |
| Features | HIGH | Feature set is spec-defined (APP-TEMPLATE-UPDATE-FINAL.md), not discovery-based. Competitor analysis confirms positioning. |
| Architecture | HIGH | Standard patterns (forward-auth, standalone Docker, multi-stage build, two-tier health probes). Official docs for every component. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls verified via official docs and GitHub issues. The drizzle-kit push RLS bug fix status for 0.45 stable (vs beta) is uncertain -- needs runtime validation. |

**Overall confidence:** HIGH

### Gaps to Address

- **drizzle-kit push RLS policy correctness:** The bug (issue #3504) is marked fixed-in-beta, but it is unclear whether the fix is in drizzle-kit 0.31.x (which is what ^0.30.4 resolves to). Must verify empirically during Phase 1 by checking `pg_policy` after a push. If broken, add `db:generate` + `db:migrate` scripts and update dev.sh accordingly.
- **NPM_TOKEN strategy final decision:** The spec uses build-args; research recommends BuildKit secrets. The roadmap should decide which approach to implement. Build-args are acceptable if images stay in private GHCR, but secrets are objectively better practice.
- **Node.js Docker base version:** Spec uses node:20-alpine (Maintenance LTS, EOL April 2026). Research recommends node:22-alpine (Active LTS, EOL April 2027). Low risk either way, but should be decided before Phase 2.
- **Tailwind v4 @source reliability:** GitHub issue #19040 reports intermittent scanning failures in node_modules. Needs visual validation after migration, not just build success.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) -- pgPolicy API, declarative RLS syntax
- [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) -- @import, @source, @theme migration
- [Next.js standalone output docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) -- standalone mode, Docker usage
- [Official Next.js Docker example](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile) -- multi-stage build pattern
- [Docker build secrets docs](https://docs.docker.com/build/building/secrets/) -- secure token injection
- [GitHub Actions Docker guide](https://docs.docker.com/guides/gha/) -- CI/CD workflow patterns
- [Caddy forward_auth docs](https://caddyserver.com/docs/caddyfile/directives/forward_auth) -- auth delegation pattern
- npm registry (direct queries 2026-02-18) -- all version numbers verified

### Secondary (MEDIUM confidence)
- [Drizzle push RLS bug #3504](https://github.com/drizzle-team/drizzle-orm/issues/3504) -- confirmed bug, fix version uncertain for stable
- [Tailwind @source node_modules issue #19040](https://github.com/tailwindlabs/tailwindcss/issues/19040) -- scanning reliability, may be resolved
- [Corepack pnpm signature issue](https://github.com/payloadcms/payload/issues/11037) -- intermittent CI failures
- [Builder.io CLAUDE.md guide](https://www.builder.io/blog/claude-md-guide) -- documentation pattern

### First-Party (HIGH confidence)
- APP-TEMPLATE-UPDATE-FINAL.md -- project spec with exact file contents for every change
- CLAUDE.md (existing) -- current template patterns and SDK documentation

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*
