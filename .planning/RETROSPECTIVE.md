# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.2 — App Template v2

**Shipped:** 2026-02-26
**Phases:** 4 | **Plans:** 8 | **Sessions:** ~3

### What Was Built
- Complete v2 template: pinned SDK versions, declarative RLS, Tailwind v4 CSS-first config
- Docker-first deployment: multi-stage Dockerfile with BuildKit secrets, dev.sh one-command setup
- Health probes (liveness + readiness) for container orchestration
- Auth SDK v0.2.0 migration: null-check pattern, synchronous root layout, logout action
- CI/CD pipeline: GitHub Actions workflow pushing Docker images to GHCR
- Full documentation rewrite: CLAUDE.md (AI context), README.md (developer guide)
- Sonner/Toast specification brief for @madebykav/ui SDK team

### What Worked
- Spec-driven approach: APP-TEMPLATE-UPDATE-FINAL.md provided exact file contents, eliminating ambiguity
- Phase dependency chain (foundation → Docker → app code → docs) ensured each phase built on solid ground
- Wave-based parallel execution within phases (plans 01 and 02 running concurrently where independent)
- Fast execution velocity: 8 plans completed in ~10 minutes total execution time

### What Was Inefficient
- ROADMAP.md had Phase 4 plan 04-01 marked `[ ]` (unchecked) despite being completed — state sync gap
- SUMMARY.md files lacked `one_liner` and `requirements-completed` frontmatter fields — tooling extraction returned nulls
- PROJECT.md Active requirements were never updated during execution — all still showed `[ ]` at milestone end

### Patterns Established
- BuildKit secret mount pattern for private GitHub Packages auth in Docker builds
- Null-check guard pattern (`if (!auth) return`) for AuthContext v0.2.0
- `satisfies` operator for strict type checking in API route handlers
- Synchronous root layout with per-page auth calls for static optimization
- CSS variable bridging for SDK component theming (--normal-bg/text/border)

### Key Lessons
1. State files (ROADMAP.md, PROJECT.md) should be updated atomically with plan completion — drift creates confusion at milestone boundary
2. Summary frontmatter schema should be enforced during execution, not discovered missing at retrospective time
3. Audit before completion is valuable — the tech debt items (logout UI gap, doc accuracy) would have been missed without it

### Cost Observations
- Model mix: primarily sonnet for execution agents, opus for orchestration
- Sessions: ~3 (initial planning, bulk execution, documentation + completion)
- Notable: 8 plans in ~10 min execution time — spec-driven approach minimized research overhead

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v0.2 | ~3 | 4 | First milestone — established spec-driven execution pattern |

### Cumulative Quality

| Milestone | Requirements | Satisfied | Tech Debt Items |
|-----------|-------------|-----------|-----------------|
| v0.2 | 27 | 27 (100%) | 6 (all non-critical) |

### Top Lessons (Verified Across Milestones)

1. Spec-driven development with exact file contents eliminates ambiguity and accelerates execution
2. Milestone audit catches integration gaps that phase-level verification misses
