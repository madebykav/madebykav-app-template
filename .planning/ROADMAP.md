# Roadmap: MadeByKav App Template v2

## Overview

This roadmap delivers the v2 update of the MadeByKav app template in four phases following the build dependency chain: foundation updates (versions, schema, Tailwind v4), Docker infrastructure and health probes, app code rewrites with CI/CD, and finally documentation. Each phase produces a coherent, testable result. The spec (APP-TEMPLATE-UPDATE-FINAL.md) provides exact file contents -- implementation follows it verbatim.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Update dependencies, schema with declarative RLS, Tailwind v4 migration, and next.config.ts
- [ ] **Phase 2: Docker & Health Probes** - Dockerfile, docker-compose, dev.sh, and health probe endpoints
- [ ] **Phase 3: App Code & CI/CD** - Rewrite layout/page/API for auth v0.2.0, add logout action, create CI/CD pipeline
- [ ] **Phase 4: Documentation** - Rewrite CLAUDE.md, README.md, and generate Toast/Sonner brief

## Phase Details

### Phase 1: Foundation
**Goal**: Developer can install dependencies, run schema push with declarative RLS, and see Tailwind v4 styles compile correctly
**Depends on**: Nothing (first phase)
**Requirements**: DEPS-01, DEPS-02, DEPS-03, DEPS-04, DEPS-05, DEPS-06, DEPS-07, SCHM-01, SCHM-02, SCHM-03, APP-04, APP-05, DOCS-01
**Success Criteria** (what must be TRUE):
  1. `pnpm install` succeeds with drizzle-orm ^0.45.0 and pinned SDK versions (auth ^0.2.0, db ^0.1.0, ui ^0.1.2), and @madebykav/ai is absent from package.json
  2. schema.ts contains pgPolicy() with createTenantPolicy() for declarative RLS, and db/index.ts no longer re-exports SDK functions
  3. globals.css uses `@import "tailwindcss"` with `@source` directive for SDK component scanning, and tailwind.config.ts is deleted
  4. next.config.ts includes `output: 'standalone'` and @madebykav/ai is removed from transpilePackages
  5. .env.example contains clear documentation with dev defaults
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Dependencies, next.config.ts, and .env.example
- [ ] 01-02-PLAN.md -- Schema declarative RLS, db/index.ts cleanup, Tailwind v4 CSS migration

### Phase 2: Docker & Health Probes
**Goal**: Developer can run `./dev.sh` to go from clone to running app with local postgres, and the app exposes working health probes for container orchestration
**Depends on**: Phase 1
**Requirements**: DOCK-01, DOCK-02, DOCK-03, DOCK-04, HLTH-01, HLTH-02
**Success Criteria** (what must be TRUE):
  1. `./dev.sh` starts a local postgres on port 5433, pushes the schema, and launches the Next.js dev server in one command
  2. `docker build` produces a working standalone image using multi-stage build with non-root user
  3. GET /api/health returns {"status":"ok"} (liveness), and GET /api/health/ready returns {"status":"ready"} or 503 with DB check (readiness)
  4. docker-compose.yml provides a dev-profile postgres service, and .dockerignore excludes node_modules, .next, .git, .env*, *.md, drizzle/
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: App Code & CI/CD
**Goal**: App code reflects auth SDK v0.2.0 breaking changes, logout works, and pushing to main triggers automated Docker image build and push to GHCR
**Depends on**: Phase 2
**Requirements**: APP-01, APP-02, APP-03, AUTH-01, CICD-01
**Success Criteria** (what must be TRUE):
  1. Root layout.tsx does not call getAuthContext() (pages are not forced dynamic)
  2. page.tsx uses new AuthContext shape (null check, auth.name, auth.email, auth.role, auth.tenantSlug) and displays user identity fields
  3. Logout server action redirects to platform /logout endpoint
  4. GitHub Actions workflow (docker-publish.yml) builds Docker image and pushes to GHCR on push to main, with SHA + latest tags
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Documentation
**Goal**: CLAUDE.md and README.md fully reflect the v2 template state so developers and AI assistants have accurate, complete guidance
**Depends on**: Phase 3
**Requirements**: DOCS-02, DOCS-03, DOCS-04
**Success Criteria** (what must be TRUE):
  1. CLAUDE.md documents updated SDK patterns (AuthContext v0.2.0 shape, withTenant imports from @madebykav/db), Docker commands, declarative RLS, and health probe endpoints
  2. README.md includes quick start (clone + dev.sh), Docker deployment instructions, project structure, and SDK version table
  3. Sonner/Toast brief exists as a spec document for platform dev to add toast notifications to @madebykav/ui SDK
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Planned | - |
| 2. Docker & Health Probes | 0/0 | Not started | - |
| 3. App Code & CI/CD | 0/0 | Not started | - |
| 4. Documentation | 0/0 | Not started | - |
