# Requirements: MadeByKav App Template v2

**Defined:** 2026-02-18
**Core Value:** A developer can go from `git clone` to a running, tenant-isolated app in one command, and from `git push` to a deployed Docker container via CI/CD — with correct auth, RLS, and health probes out of the box.

## v1 Requirements

Requirements for the v2 template update. Each maps to roadmap phases.

### Dependencies

- [ ] **DEPS-01**: Update drizzle-orm from ^0.38.4 to ^0.45.0 (required by @madebykav/db peer dep)
- [ ] **DEPS-02**: Pin @madebykav/auth to ^0.2.0 (breaking change to AuthContext type)
- [ ] **DEPS-03**: Pin @madebykav/db to ^0.1.0
- [ ] **DEPS-04**: Pin @madebykav/ui to ^0.1.2
- [ ] **DEPS-05**: Remove @madebykav/ai from dependencies
- [ ] **DEPS-06**: Add `output: 'standalone'` to next.config.ts
- [ ] **DEPS-07**: Remove @madebykav/ai from transpilePackages in next.config.ts

### Schema & Database

- [ ] **SCHM-01**: Add pgPolicy() declarative RLS to schema.ts using createTenantPolicy()
- [ ] **SCHM-02**: Remove SDK re-exports (withTenant, withoutRLS) from db/index.ts
- [ ] **SCHM-03**: Update all withTenant imports to use @madebykav/db directly

### App Code

- [ ] **APP-01**: Remove getAuthContext() call from root layout.tsx (forces every page dynamic)
- [ ] **APP-02**: Update page.tsx to new AuthContext shape (null check, auth.name, auth.email, auth.role, auth.tenantSlug)
- [ ] **APP-03**: Update API example route with NewExampleItem type usage
- [ ] **APP-04**: Add @source directive to globals.css for Tailwind v4 SDK class scanning
- [ ] **APP-05**: Delete tailwind.config.ts (Tailwind v4 uses CSS-based config)

### Health & Auth

- [ ] **HLTH-01**: Create liveness probe at /api/health returning {"status":"ok"}
- [ ] **HLTH-02**: Create readiness probe at /api/health/ready (checks DB with SELECT 1, returns 503 if unreachable)
- [ ] **AUTH-01**: Create logout server action (redirects to platform /logout endpoint)

### Docker Infrastructure

- [ ] **DOCK-01**: Create multi-stage Dockerfile (base/deps/builder/runner with standalone output, non-root user, HEALTHCHECK)
- [ ] **DOCK-02**: Create .dockerignore (exclude node_modules, .next, .git, .env*, *.md, drizzle/)
- [ ] **DOCK-03**: Create docker-compose.yml (local dev postgres on port 5433 with dev profile)
- [ ] **DOCK-04**: Create dev.sh script (start postgres, wait for readiness, push schema, run dev server)

### CI/CD

- [ ] **CICD-01**: Create GitHub Actions workflow (docker-publish.yml) to build and push Docker image to GHCR on push to main

### Documentation

- [ ] **DOCS-01**: Update .env.example with clearer documentation, dev defaults, and app identity vars
- [ ] **DOCS-02**: Rewrite CLAUDE.md with updated SDK docs (AuthContext v0.2.0), patterns, architecture context, commands, and things to avoid
- [ ] **DOCS-03**: Rewrite README.md with quick start, deployment (Docker + Vercel), project structure, and SDK table
- [ ] **DOCS-04**: Generate Sonner/Toast brief for platform dev (@madebykav/ui SDK addition request)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Developer Experience

- **DX-01**: Custom error boundary page (error.tsx)
- **DX-02**: Custom not-found page (not-found.tsx)
- **DX-03**: Loading UI example (loading.tsx) demonstrating Suspense/streaming
- **DX-04**: Example server action with form (data mutation pattern)

### Security

- **SEC-01**: Content Security Policy headers via next.config.ts
- **SEC-02**: Switch Docker NPM_TOKEN from build-args to BuildKit secrets

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication library (NextAuth, Clerk) | Auth handled at proxy layer — adding a library creates parallel auth system |
| @madebykav/ai as default dep | Optional — not every app needs it. Devs add when needed |
| Testing framework (Jest, Vitest, Playwright) | Template is a starting point. Testing is opinionated and app-specific |
| Monorepo/workspace (Turborepo) | Template is for single app. Platform provides shared code via NPM packages |
| Internationalization (i18n) | Most apps start single-language. Add next-intl when needed |
| Real-time features (WebSockets, SSE) | Infrastructure complexity. Build when app needs it |
| State management library (Zustand, Jotai) | RSC reduces need for client state. Add when complexity demands |
| Database migration files | Template uses db:push for dev. Devs switch to generate+migrate for production |
| Upgrading to Next.js 16 | Decision to stay on 15 per spec. Auth SDK supports ^14-^16. Devs upgrade when ready |
| Vercel-specific configuration | Template targets Docker/container deployment. standalone output is harmless for Vercel |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPS-01 | Phase 1 | Pending |
| DEPS-02 | Phase 1 | Pending |
| DEPS-03 | Phase 1 | Pending |
| DEPS-04 | Phase 1 | Pending |
| DEPS-05 | Phase 1 | Pending |
| DEPS-06 | Phase 1 | Pending |
| DEPS-07 | Phase 1 | Pending |
| SCHM-01 | Phase 1 | Pending |
| SCHM-02 | Phase 1 | Pending |
| SCHM-03 | Phase 1 | Pending |
| APP-01 | Phase 3 | Pending |
| APP-02 | Phase 3 | Pending |
| APP-03 | Phase 3 | Pending |
| APP-04 | Phase 1 | Pending |
| APP-05 | Phase 1 | Pending |
| HLTH-01 | Phase 2 | Pending |
| HLTH-02 | Phase 2 | Pending |
| AUTH-01 | Phase 3 | Pending |
| DOCK-01 | Phase 2 | Pending |
| DOCK-02 | Phase 2 | Pending |
| DOCK-03 | Phase 2 | Pending |
| DOCK-04 | Phase 2 | Pending |
| CICD-01 | Phase 3 | Pending |
| DOCS-01 | Phase 1 | Pending |
| DOCS-02 | Phase 4 | Pending |
| DOCS-03 | Phase 4 | Pending |
| DOCS-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-19 after roadmap creation*
