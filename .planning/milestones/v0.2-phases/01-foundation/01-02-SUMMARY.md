---
phase: 01-foundation
plan: 02
subsystem: database
tags: [drizzle-orm, pgPolicy, rls, tailwind-v4, css-first-config]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: drizzle-orm ^0.45.0 with pgPolicy support
provides:
  - Declarative RLS via pgPolicy() in schema.ts (version-controlled, no manual SQL)
  - Clean db/index.ts without SDK re-exports
  - Tailwind v4 CSS-first config with @source directive for SDK scanning
  - No legacy tailwind.config.ts
affects: [01-foundation, 02-docker-devops]

# Tech tracking
tech-stack:
  added: []
  patterns: [declarative-rls-pgPolicy, tailwind-v4-css-first, source-directive-sdk-scanning]

key-files:
  created: []
  modified: [src/lib/db/schema.ts, src/lib/db/index.ts, src/app/globals.css, src/app/page.tsx]

key-decisions:
  - "Declarative RLS via pgPolicy() replaces manual SQL tenantRlsPolicy() approach"
  - "db/index.ts exports only db and Database type -- consumers import withTenant directly from @madebykav/db"
  - "Tailwind v4 @source directive replaces content array in tailwind.config.ts"

patterns-established:
  - "Declarative RLS: define pgPolicy() as third argument to pgTable() with createTenantPolicy() from SDK"
  - "Direct SDK imports: import withTenant from @madebykav/db, not from @/lib/db"
  - "CSS-first Tailwind: use @source in globals.css for external package scanning instead of tailwind.config.ts content array"

requirements-completed: [SCHM-01, SCHM-02, SCHM-03, APP-04, APP-05]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 1 Plan 2: Schema and Config Modernization Summary

**Declarative RLS via pgPolicy() + createTenantPolicy() in schema.ts, Tailwind v4 CSS-first config with @source SDK scanning, deleted tailwind.config.ts**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T23:59:37Z
- **Completed:** 2026-02-25T00:02:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Rewrote schema.ts to use declarative RLS via pgPolicy() with createTenantPolicy() as third argument to pgTable()
- Cleaned up db/index.ts by removing withTenant/withoutRLS re-exports and unnecessary comments
- Added @source directive to globals.css for Tailwind v4 SDK component class scanning
- Deleted legacy tailwind.config.ts -- Tailwind v4 uses CSS-first configuration exclusively

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite schema.ts with declarative RLS and clean up db/index.ts** - `b0a2a1d` (feat)
2. **Task 2: Add @source directive to globals.css and delete tailwind.config.ts** - `eb71123` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Declarative RLS via pgPolicy() + createTenantPolicy() in pgTable third argument
- `src/lib/db/index.ts` - Clean database connection; removed SDK re-exports and intermediate variables
- `src/app/globals.css` - Added @source directive for @madebykav/ui scanning; simplified @theme block
- `tailwind.config.ts` - Deleted (replaced by CSS-first @source in globals.css)
- `src/app/page.tsx` - Fixed pre-existing appSlug -> tenantSlug type error (deviation)

## Decisions Made
- Declarative RLS via pgPolicy() replaces manual SQL tenantRlsPolicy() approach -- policies are now version-controlled in schema
- db/index.ts exports only db and Database type -- consumers import withTenant directly from @madebykav/db
- Tailwind v4 @source directive replaces the content array that was in tailwind.config.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing appSlug type error in page.tsx**
- **Found during:** Task 2 (pnpm build verification)
- **Issue:** page.tsx referenced `auth?.appSlug` but AuthContext has `tenantSlug`, not `appSlug`. Pre-existing bug that blocked `pnpm build`.
- **Fix:** Changed `auth?.appSlug` to `auth?.tenantSlug` and updated label from "App Slug" to "Tenant Slug"
- **Files modified:** src/app/page.tsx
- **Verification:** `pnpm build` succeeds, TypeScript compilation passes
- **Committed in:** `eb71123` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial property rename fix to unblock build verification. No scope creep.

## Issues Encountered

None beyond the documented deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema has declarative RLS ready for `drizzle-kit push` (note: verify USING clauses per drizzle-kit #3504 concern)
- Tailwind v4 CSS-first config is complete; no JS config files remain
- All SDK imports are direct (withTenant from @madebykav/db), clean dependency graph
- `pnpm build` passes successfully

## Self-Check: PASSED

All files verified present. All commits verified in git history. tailwind.config.ts confirmed deleted.

---
*Phase: 01-foundation*
*Completed: 2026-02-25*
