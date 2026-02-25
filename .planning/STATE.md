# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** A developer can go from `git clone` to a running, tenant-isolated app in one command (`./dev.sh`), and from `git push` to a deployed Docker container via CI/CD -- with correct auth, RLS, and health probes out of the box.
**Current focus:** Phase 2: Docker & Health Probes

## Current Position

Phase: 2 of 4 (Docker & Health Probes) -- COMPLETE
Plan: 2 of 2 in current phase -- COMPLETE
Status: Phase 2 Complete
Last activity: 2026-02-25 -- Completed 02-02-PLAN.md (health probes and dev script)

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 1.3min
- Total execution time: 0.08 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 P01 | 1min | 2 tasks | 4 files |
| Phase 01 P02 | 2min | 2 tasks | 4 files |
| Phase 02 P01 | 1min | 2 tasks | 4 files |
| Phase 02 P02 | 1min | 2 tasks | 3 files |

**Recent Trend:**
- Last 5 plans: 1min, 2min, 1min, 1min
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

### Pending Todos

None yet.

### Blockers/Concerns

- drizzle-kit push RLS bug (#3504): After Phase 1 schema push, must verify pg_policy catalog for correct USING clauses. If empty, switch to generate+migrate workflow.
- ~~NPM_TOKEN in Docker build-args leaks into image layers.~~ RESOLVED: BuildKit secret mount in Dockerfile (02-01).

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 02-02-PLAN.md (Phase 2 complete)
Resume file: .planning/phases/02-docker-health-probes/02-02-SUMMARY.md
