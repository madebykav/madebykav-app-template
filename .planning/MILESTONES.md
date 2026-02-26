# Milestones

## v0.2 App Template v2 (Shipped: 2026-02-26)

**Phases completed:** 4 phases, 8 plans, 0 tasks

**Key accomplishments:**
- Pinned SDK versions (auth@0.2.0, db@0.1.0, ui@0.1.2) and bumped drizzle-orm to ^0.45.0
- Declarative RLS via pgPolicy() + createTenantPolicy() replacing manual SQL
- Multi-stage Dockerfile with BuildKit secrets + dev.sh one-command setup
- Liveness and readiness health probes for container orchestration
- App code rewritten for auth SDK v0.2.0 with logout server action
- GitHub Actions CI/CD for automated Docker image publishing to GHCR
- CLAUDE.md and README.md fully rewritten for v2 patterns
- Sonner/Toast specification brief for @madebykav/ui SDK

**Stats:** 43 commits, 67 files changed, 359 LOC app code, 29 days (Jan 27 — Feb 25, 2026)

**Known Tech Debt:**
- Logout server action has no template UI consumer
- CLAUDE.md uses Response.json() but template uses NextResponse.json()
- src/components/ directory referenced in docs but not on disk

---

