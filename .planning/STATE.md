# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** A developer can go from `git clone` to a running, tenant-isolated app in one command (`./dev.sh`), and from `git push` to a deployed Docker container via CI/CD -- with correct auth, RLS, and health probes out of the box.
**Current focus:** Phase 1: Foundation

## Current Position

Phase: 1 of 4 (Foundation) -- COMPLETE
Plan: 2 of 2 in current phase -- COMPLETE
Status: Phase 1 Complete
Last activity: 2026-02-25 -- Completed 01-02-PLAN.md (schema and config modernization)

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 1.5min
- Total execution time: 0.05 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 01 P01 | 1min | 2 tasks | 4 files |
| Phase 01 P02 | 2min | 2 tasks | 4 files |

**Recent Trend:**
- Last 5 plans: 1min, 2min
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

### Pending Todos

None yet.

### Blockers/Concerns

- drizzle-kit push RLS bug (#3504): After Phase 1 schema push, must verify pg_policy catalog for correct USING clauses. If empty, switch to generate+migrate workflow.
- NPM_TOKEN in Docker build-args leaks into image layers. Consider BuildKit secrets in Phase 2.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 01-02-PLAN.md (Phase 1 complete)
Resume file: .planning/phases/01-foundation/01-02-SUMMARY.md
