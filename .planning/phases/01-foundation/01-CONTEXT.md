# Phase 1: Foundation - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Update dependencies to pinned SDK versions, rewrite schema with declarative RLS via pgPolicy(), migrate to Tailwind v4 CSS config, and update next.config.ts for standalone output. This phase produces a codebase that installs cleanly, compiles Tailwind v4, and pushes schema with RLS policies.

</domain>

<decisions>
## Implementation Decisions

### Spec-Driven Phase

All implementation decisions are prescribed by the spec document (`APP-TEMPLATE-UPDATE-FINAL.md`). Every file has exact contents defined. Key decisions from the spec:

- **Dependencies:** drizzle-orm ^0.45.0, @madebykav/auth ^0.2.0, @madebykav/db ^0.1.0, @madebykav/ui ^0.1.2. Remove @madebykav/ai entirely.
- **Schema:** Add `pgPolicy()` with `createTenantPolicy()` as third argument to `pgTable()`. Remove manual RLS SQL comments.
- **Tailwind v4:** Add `@source` directive for SDK component scanning in globals.css. Delete `tailwind.config.ts`.
- **Next config:** Add `output: 'standalone'`, remove @madebykav/ai from transpilePackages.
- **DB index:** Remove re-exports of `withTenant` and `withoutRLS` (import directly from @madebykav/db).
- **.env.example:** Updated with dev defaults (DATABASE_URL pointing to localhost:5433) and clear documentation.

### Claude's Discretion

- Order of file changes during implementation
- How to verify each change works (build, type-check, etc.)
- Whether to update pnpm-lock.yaml incrementally or regenerate

</decisions>

<specifics>
## Specific Ideas

Implementation follows APP-TEMPLATE-UPDATE-FINAL.md verbatim. The spec provides exact file contents for every file in this phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion was skipped because the spec fully prescribes this phase.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-20*
