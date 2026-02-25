# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** A developer can go from `git clone` to a running, tenant-isolated app in one command (`./dev.sh`), and from `git push` to a deployed Docker container via CI/CD -- with correct auth, RLS, and health probes out of the box.
**Current focus:** Phase 4: Documentation

## Current Position

Phase: 4 of 4 (Documentation) -- IN PROGRESS
Plan: 2 of 2 in current phase -- 04-02-PLAN.md COMPLETE
Status: Phase 4 In Progress (Plan 01 remaining)
Last activity: 2026-02-25 -- Completed 04-02-PLAN.md (Sonner/Toast specification brief)

Progress: [████████░░] 80%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 1.1min
- Total execution time: 0.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 P01 | 1min | 2 tasks | 4 files |
| Phase 01 P02 | 2min | 2 tasks | 4 files |
| Phase 02 P01 | 1min | 2 tasks | 4 files |
| Phase 02 P02 | 1min | 2 tasks | 3 files |
| Phase 03 P01 | 1min | 2 tasks | 3 files |
| Phase 03 P02 | 1min | 2 tasks | 2 files |
| Phase 04 P02 | 1min | 1 tasks | 1 files |

**Recent Trend:**
- Last 5 plans: 1min, 1min, 1min, 1min, 1min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- drizzle-orm ^0.45.0 required by @madebykav/db peer dep (install fails without it)
- Auth SDK v0.2.0 breaking change: AuthContext returns null (not object with null fields)
- Tailwind v4 CSS config replaces tailwind.config.ts
- drizzle-kit push may create empty RLS USING clauses (verify after push)
- [Phase 01]: Pinned SDK versions instead of using latest tag for reproducible builds
- [Phase 01]: Removed @madebykav/ai as it is optional and not every app needs it
- [Phase 01]: Declarative RLS via pgPolicy() replaces manual SQL tenantRlsPolicy() approach
- [Phase 01]: db/index.ts exports only db and Database type -- consumers import withTenant directly from @madebykav/db
- [Phase 01]: Tailwind v4 @source directive replaces content array in tailwind.config.ts
- [Phase 02]: BuildKit secret mount for GITHUB_TOKEN avoids token leaking into image layers
- [Phase 02]: Port 5433 on host avoids conflict with system postgres installations
- [Phase 02]: Dev profile gating ensures postgres only starts when explicitly requested
- [Phase 02]: No auth on health probes -- container orchestration needs unrestricted access
- [Phase 02]: Liveness probe does NOT check DB -- prevents restart loops when DB is down
- [Phase 02]: exec pnpm dev replaces shell process for clean signal handling in dev.sh
- [Phase 03]: Null-check guard pattern (if (!auth) return) replaces optional chaining for v0.2.0 AuthContext
- [Phase 03]: Synchronous root layout -- pages call getAuthContext() individually for static optimization
- [Phase 03]: satisfies operator replaces intermediate typed variable for stricter excess-property checking
- [Phase 03]: BuildKit secrets input (not build-args) in CI/CD workflow matches Dockerfile --mount=type=secret pattern
- [Phase 04]: Sonner as direct dependency of @madebykav/ui, not peer dependency
- [Phase 04]: CSS variable integration via --normal-bg/text/border mapping to platform tokens

### Pending Todos

None yet.

### Blockers/Concerns

- drizzle-kit push RLS bug (#3504): After Phase 1 schema push, must verify pg_policy catalog for correct USING clauses. If empty, switch to generate+migrate workflow.
- ~~NPM_TOKEN in Docker build-args leaks into image layers.~~ RESOLVED: BuildKit secret mount in Dockerfile (02-01).

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 04-02-PLAN.md (Sonner/Toast brief)
Resume file: .planning/phases/04-documentation/04-02-SUMMARY.md
