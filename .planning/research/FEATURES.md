# Feature Research

**Domain:** Platform-specific Next.js app template (developer starter kit for multi-tenant apps)
**Researched:** 2026-02-18
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Developers Expect These)

Features developers assume exist in any production-ready app template. Missing these means the template feels unfinished and developers will look elsewhere or spend their first day building boilerplate instead of their app.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Docker multi-stage build** | Every containerized Next.js app needs this. The official Vercel example uses the same pattern (base/deps/builder/runner). Without it, developers must figure out standalone output + Docker from scratch. | LOW | Use `node:20-alpine`, 3-stage build, non-root user. Directly matches [Vercel's official with-docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker). Template already specifies this in APP-TEMPLATE-UPDATE-FINAL.md. |
| **`output: 'standalone'`** | Required for Docker. Without it, the standalone output is not produced and Docker images include full `node_modules` (700MB+ vs ~100MB). Next.js official docs list this as a prerequisite for Docker deployment. | LOW | Single line in `next.config.ts`. Already specified in update spec. |
| **`.dockerignore`** | Without it, Docker context includes `node_modules`, `.git`, and `.env` files -- bloating build time and leaking secrets into images. | LOW | Standard file, already specified in update spec. |
| **`.env.example`** | Developers need to know what environment variables are required without reading docs. Every serious template ships this. It documents the contract between template and runtime. | LOW | Already specified. Must include DATABASE_URL, GITHUB_TOKEN guidance, PLATFORM_URL, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_SLUG. |
| **Health probe endpoints** | Kubernetes, Docker Swarm, and even simple Docker `HEALTHCHECK` directives need endpoints to determine container health. Liveness probes (`/api/health`) prevent zombie containers; readiness probes (`/api/health/ready`) prevent routing traffic to a container that cannot reach its database. Industry standard since ~2018. | LOW | Liveness: always returns 200. Readiness: pings DB with `SELECT 1`. [Node.js Reference Architecture recommends](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/) separate `/livez` and `/readyz` paths; `/api/health` and `/api/health/ready` achieve the same separation. |
| **Local dev database (docker-compose)** | Developers should not install PostgreSQL globally. Every modern full-stack template (T3, Supastarter, MakerKit) provides a docker-compose for local services. Port 5433 avoids conflicts with existing system postgres on 5432. | LOW | `docker-compose.yml` with `profiles: [dev]` so it only starts when explicitly requested. Already specified. |
| **One-command dev setup** | The gold standard for developer onboarding is "clone, configure token, run one command." Templates that require 5+ manual steps lose developers in the first 10 minutes. Microsoft's [engineering playbook](https://microsoft.github.io/code-with-engineering-playbook/developer-experience/onboarding-guide-template/) and [Cortex's onboarding guide](https://www.cortex.io/post/developer-onboarding-guide) both emphasize this. | LOW | `dev.sh` script: start postgres, wait for readiness, push schema, start Next.js. Already specified in update doc. |
| **CI/CD pipeline (GitHub Actions)** | Templates without CI/CD force developers to build their own pipeline from scratch. The standard for 2025+ is: push to main -> build Docker image -> publish to registry. GitHub Actions + GHCR is the natural choice when packages already come from GitHub Packages. | MEDIUM | Workflow: checkout, login to GHCR, build+push with sha and latest tags. Already specified. Must handle `NPM_TOKEN` secret for private package installs during build. |
| **Tailwind v4 CSS-first config** | Tailwind v4 is the current version. Templates shipping v3-style `tailwind.config.ts` files are immediately outdated. The migration to CSS-first `@import "tailwindcss"` + `@theme` directives is a one-way door. | LOW | Replace `tailwind.config.ts` with `@source` directive in `globals.css`. Delete the old config file. Already specified. |
| **Declarative RLS in schema** | The v1 template requires manually running `SELECT create_tenant_policy(...)` after each schema push -- a step developers forget 100% of the time. Declarative `pgPolicy()` in the Drizzle schema means `db:push` handles everything. | MEDIUM | Uses `pgPolicy()` from drizzle-orm + `createTenantPolicy()` from `@madebykav/db`. Already specified. This is a breaking change from v1's manual approach. |
| **TypeScript strict mode** | Every credible Next.js template in 2025 uses TypeScript. The template already has it but must ensure `strict: true` in tsconfig for type safety. | LOW | Already present in template. |
| **Comprehensive CLAUDE.md** | With AI-assisted development now standard (Claude Code, Cursor, Copilot), a well-structured CLAUDE.md file is the single most impactful documentation artifact. It tells the AI assistant: what SDK patterns to use, what to avoid, available commands, architecture constraints. [Builder.io's guide](https://www.builder.io/blog/claude-md-guide) and [Vercel's own next-devtools-mcp](https://github.com/vercel/next-devtools-mcp/blob/main/CLAUDE.md) both demonstrate this pattern. | MEDIUM | Must cover: AuthContext type (v0.2.0 breaking change), withTenant pattern, RLS requirements, forbidden patterns (never query without withTenant, never auth in root layout), commands, and architecture context. |
| **Comprehensive README.md** | The README is the first thing a developer sees. Must cover: quick start, project structure, SDK packages, deployment (Docker + Vercel), and environment setup. | MEDIUM | Full rewrite covering: 5-step quick start, project tree, SDK table, Docker build commands, and deployment guidance. |
| **Pinned SDK versions** | The v1 template uses `"latest"` for all `@madebykav/*` packages -- meaning `pnpm install` on different days produces different results. Pinned versions with `^` ranges ensure reproducible builds while allowing patches. | LOW | `@madebykav/auth: ^0.2.0`, `@madebykav/db: ^0.1.0`, `@madebykav/ui: ^0.1.2`. Remove `@madebykav/ai` (optional, add when needed). |
| **Non-root Docker user** | Running containers as root is a security anti-pattern. The official Next.js Docker example creates a `nextjs` user with UID 1001. | LOW | Already in the Dockerfile spec. Standard practice. |
| **Logout action** | Apps need a way to log out. Since auth is proxy-based, logout means redirecting to the platform's `/logout` endpoint. Without this, developers have to figure out the logout flow themselves. | LOW | Server Action that redirects to `PLATFORM_URL/logout`. Already specified. |

### Differentiators (Competitive Advantage)

Features that set this platform-specific template apart from generic Next.js starters (create-next-app, T3, etc.). These are not expected from a generic template but are high-value for a platform ecosystem.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Platform-aware auth context** | Generic templates require developers to integrate auth from scratch (NextAuth, Clerk, etc.). This template reads trusted proxy headers with zero config -- no API keys, no OAuth setup, no session management. Developers get `getAuthContext()` and `requireAuth()` for free. | LOW (SDK handles it) | This is the primary differentiator vs. every other Next.js template. Auth is a solved problem at the proxy layer. The template just needs to demonstrate the pattern clearly. |
| **Automatic tenant isolation via RLS** | Multi-tenancy is the hardest part of SaaS architecture. Supastarter charges $299+ for this. This template provides it for free via `withTenant()` + declarative `pgPolicy()`. Developers write normal queries and get tenant isolation automatically. | LOW (SDK handles it) | The key differentiator vs. even premium SaaS starters. RLS is enforced at the database level, not in application code. |
| **App-owns-database architecture** | Unlike shared-database platforms (where all apps query a central DB), each app owns its PostgreSQL instance. This means: no cross-app failure modes, independent scaling, independent schema evolution, and clean table names (no app-slug prefixes). | LOW (infrastructure) | Already the architecture decision. The template just needs to document it clearly. This is better than most platform approaches. |
| **Backend proxy pattern documentation** | For apps that need non-JS backends (Python ML, Go microservices), the template documents how to proxy requests from Next.js to internal services while forwarding auth headers. Most templates assume a monolithic architecture. | MEDIUM | Documentation-only in CLAUDE.md. Not implemented as code in the template, but the pattern is documented for developers who need it. |
| **`@source` directive for shared UI scanning** | Tailwind v4's `@source` directive ensures classes from `@madebykav/ui` are included in the CSS output. Without this, shared component styles silently break. No generic template handles this because they do not have shared component libraries. | LOW | Single line in `globals.css`. Platform-specific knowledge that generic templates cannot provide. |
| **HEALTHCHECK in Dockerfile** | The official Next.js Docker example does NOT include a HEALTHCHECK directive. Adding `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1` means Docker itself (not just orchestrators) can detect unhealthy containers. | LOW | Goes beyond the official example. Uses `wget` (available in Alpine) instead of `curl` (not in Alpine by default). |
| **Dev profile for docker-compose** | Using `profiles: [dev]` in docker-compose means the database only starts when explicitly requested (`docker compose --profile dev up -d`), not on every `docker compose up`. This prevents accidental resource consumption and makes intent explicit. | LOW | Subtle but thoughtful DX detail that most templates miss. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for a platform-specific template. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Authentication library integration (NextAuth, Clerk, Auth0)** | Developers are habituated to setting up auth in every project. | Auth is handled at the proxy layer. Adding an auth library creates a parallel auth system that conflicts with platform identity headers. It adds config complexity, API keys, and a false sense that apps manage their own auth. | Document that auth is solved: proxy headers in production, cookie validation fallback in dev via `@madebykav/auth` SDK. |
| **`@madebykav/ai` as a default dependency** | Every app might need AI features eventually. | Not every app needs AI. Including it by default adds unnecessary dependency weight, requires AI service configuration, and confuses developers building non-AI apps. | Remove from default dependencies. Document in CLAUDE.md/README as an optional add-on: `pnpm add @madebykav/ai`. |
| **Vercel-specific configuration** | Many Next.js developers deploy to Vercel. | This template targets Docker/container deployment behind Caddy. Adding `vercel.json`, Vercel env var conventions, or edge runtime configurations creates confusion about the deployment target. `output: 'standalone'` is harmless for Vercel, but the template should not optimize for Vercel at the expense of Docker clarity. | Note in README that `standalone` output works on Vercel too, but the template is designed for containerized deployment. |
| **Testing framework setup (Jest, Vitest, Playwright)** | Production-ready implies testing. | A template is a starting point, not a complete application. Testing frameworks are opinionated (Jest vs Vitest, RTL vs Playwright) and add significant devDependency weight. Developers should choose their testing stack. | Keep the template lean. Developers add testing when they start building real features. Document recommended options in CLAUDE.md if needed. |
| **Monorepo/workspace configuration (Turborepo)** | Platform apps might share code. | The template is for a single app. Monorepo tooling adds complexity that most apps never need. The platform already provides shared code via NPM packages (`@madebykav/*`). | Use NPM packages for shared code. If a developer needs a monorepo, they graduate from the template. |
| **Database migration files in the template** | Migrations are "more production-ready" than `db:push`. | For a template, `db:push` is the right tool -- it pushes schema declaratively without requiring migration history. Migration files in the template would be for the example table, which developers will immediately delete. Migrations become relevant once developers build their actual schema. | Ship with `db:push` for development. Document that developers should switch to `db:generate` + migration files when they have a production database with real data. |
| **Internationalization (i18n)** | Global apps need multiple languages. | Adds routing complexity (`/en/page`, `/fr/page`), content management overhead, and SSR complications. Most platform apps start single-language. | Add i18n when needed. next-intl is the recommended library if needed later. |
| **Real-time features (WebSockets, SSE)** | Modern apps need real-time updates. | Adds infrastructure complexity (WebSocket servers, connection management) that most CRUD apps never need. Behind a reverse proxy (Caddy), WebSocket configuration requires additional setup. | Build real-time features when the app actually needs them. Document the pattern in CLAUDE.md for future reference. |
| **State management library (Zustand, Jotai)** | Complex apps need global state. | Next.js App Router with Server Components reduces the need for client-side state management. Adding a state management library to a template that is mostly Server Components sends the wrong architectural signal. | Use React's built-in state (`useState`, `useContext`) and URL state (`searchParams`). Add Zustand/Jotai only when actual complexity demands it. |
| **Email sending (Resend, SendGrid)** | Apps need to send emails. | Not all apps send emails. Email service configuration (API keys, domain verification, templates) is app-specific and adds unused complexity to the template. | Document as an optional integration. Developers add when their app needs email. |

## Feature Dependencies

```
Dockerfile
    |-- requires --> output: 'standalone' (next.config.ts)
    |-- requires --> .dockerignore
    |-- uses -----> /api/health (HEALTHCHECK directive)

docker-compose.yml
    |-- enables --> dev.sh (one-command setup)
    |-- provides -> DATABASE_URL for local dev

dev.sh
    |-- requires --> docker-compose.yml (starts postgres)
    |-- requires --> db:push (pushes schema)
    |-- requires --> pnpm dev (starts Next.js)

Declarative RLS (pgPolicy in schema.ts)
    |-- requires --> drizzle-orm ^0.45.0 (pgPolicy API)
    |-- requires --> @madebykav/db ^0.1.0 (createTenantPolicy)
    |-- replaces --> manual SQL after db:push (v1 pattern)

CI/CD (docker-publish.yml)
    |-- requires --> Dockerfile
    |-- requires --> NPM_TOKEN secret (for private package installs)
    |-- requires --> GHCR authentication

Tailwind v4 CSS config
    |-- requires --> delete tailwind.config.ts
    |-- requires --> @source directive in globals.css
    |-- requires --> @import "tailwindcss" (replaces @tailwind directives)

CLAUDE.md rewrite
    |-- depends on --> all other features being finalized first
    |-- must reflect --> new AuthContext type (v0.2.0 breaking change)
    |-- must reflect --> declarative RLS pattern
    |-- must reflect --> standalone architecture (app-owned DB)

Health probes
    |-- liveness --> /api/health (no dependencies, always 200)
    |-- readiness --> /api/health/ready (requires db connection)
    |-- consumed by --> Dockerfile HEALTHCHECK (liveness)
    |-- consumed by --> orchestrator probes (both)
```

### Dependency Notes

- **Dockerfile requires `output: 'standalone'`:** Without standalone output, there is no `.next/standalone` directory to copy into the runner stage. The Docker build will fail at the `COPY --from=builder /app/.next/standalone ./` step.
- **dev.sh requires docker-compose.yml:** The script runs `docker compose --profile dev up -d` as its first step. Without the compose file, the command fails.
- **Declarative RLS requires drizzle-orm ^0.45.0:** The `pgPolicy()` function was added in a recent drizzle-orm release. The v1 template's `^0.38.4` does not have it. This is a breaking dependency change.
- **CI/CD requires NPM_TOKEN secret:** During Docker build, `pnpm install` needs to authenticate to GitHub Packages to install `@madebykav/*` SDKs. Without this secret, the build fails silently on "404 Not Found" errors for private packages.
- **CLAUDE.md should be written last:** It documents the patterns established by all other features. Writing it before the features are finalized risks inconsistency.

## MVP Definition

This is a v1-to-v2 update for an existing template. All features listed in "Table Stakes" are the MVP -- they collectively define what makes v2 ready for developers.

### Launch With (v2.0)

- [x] Docker multi-stage build (Dockerfile + .dockerignore) -- containerized deployment is the primary use case
- [x] `output: 'standalone'` in next.config.ts -- required for Docker
- [x] Health probe endpoints (/api/health, /api/health/ready) -- required for orchestrator integration
- [x] Local dev database (docker-compose.yml) -- zero-install dev experience
- [x] One-command dev setup (dev.sh) -- clone-to-running in under 2 minutes
- [x] CI/CD pipeline (GitHub Actions docker-publish.yml) -- push-to-deploy automation
- [x] Tailwind v4 CSS-first config -- current framework version
- [x] Declarative RLS in schema (pgPolicy + createTenantPolicy) -- eliminates manual SQL step
- [x] Updated SDK versions (auth ^0.2.0, db ^0.1.0, ui ^0.1.2) -- fixes breaking changes
- [x] Remove @madebykav/ai default dependency -- optional, add when needed
- [x] Updated AuthContext usage (null check, new fields) -- reflects v0.2.0 breaking change
- [x] Logout server action -- basic auth flow completion
- [x] .env.example with clear documentation -- environment contract
- [x] CLAUDE.md full rewrite -- AI-assisted development context
- [x] README.md full rewrite -- human developer onboarding

### Add After Validation (v2.x)

- [ ] Error boundary pages (`error.tsx`, `not-found.tsx`) -- Next.js production checklist recommends custom error pages, but these are app-specific and low priority for a template
- [ ] Loading UI (`loading.tsx`) -- demonstrates Suspense/streaming pattern, useful for developer education
- [ ] Example server action with form -- demonstrates the recommended data mutation pattern (current template only shows API routes)
- [ ] Content Security Policy headers -- Next.js production checklist item, but requires app-specific configuration

### Future Consideration (v3+)

- [ ] Multi-environment Docker compose (staging, production) -- useful when apps need environment-specific configs
- [ ] Cache handler for multi-instance deployments -- needed when running multiple container replicas behind a load balancer (official docs recommend custom cache handler)
- [ ] `deploymentId` for version skew protection -- needed for rolling deployments; official Next.js docs document this pattern
- [ ] Instrumentation/telemetry setup -- OpenTelemetry integration for production monitoring

## Feature Prioritization Matrix

| Feature | Developer Value | Implementation Cost | Priority |
|---------|----------------|---------------------|----------|
| Dockerfile + .dockerignore | HIGH | LOW | P1 |
| output: 'standalone' | HIGH | LOW | P1 |
| Health probes | HIGH | LOW | P1 |
| docker-compose.yml | HIGH | LOW | P1 |
| dev.sh | HIGH | LOW | P1 |
| CI/CD workflow | HIGH | MEDIUM | P1 |
| Declarative RLS (pgPolicy) | HIGH | MEDIUM | P1 |
| Tailwind v4 migration | HIGH | LOW | P1 |
| SDK version updates | HIGH | LOW | P1 |
| CLAUDE.md rewrite | HIGH | MEDIUM | P1 |
| README.md rewrite | HIGH | MEDIUM | P1 |
| .env.example update | MEDIUM | LOW | P1 |
| Logout action | MEDIUM | LOW | P1 |
| Remove @madebykav/ai | MEDIUM | LOW | P1 |
| Updated page.tsx / layout.tsx | MEDIUM | LOW | P1 |
| Error boundary pages | MEDIUM | LOW | P2 |
| Loading UI example | LOW | LOW | P2 |
| Server action form example | MEDIUM | LOW | P2 |
| CSP headers | MEDIUM | MEDIUM | P2 |
| Multi-env Docker | LOW | MEDIUM | P3 |
| Cache handler | LOW | HIGH | P3 |
| deploymentId | LOW | LOW | P3 |
| Instrumentation | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v2 launch (all items in the update spec)
- P2: Should have, add in v2.x patches
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | create-next-app | create-t3-app | Supastarter ($299) | ShipFast ($169) | **MadeByKav Template v2** |
|---------|----------------|---------------|-------------------|----------------|--------------------------|
| TypeScript | Yes | Yes | Yes | Yes | Yes |
| Tailwind CSS | Yes (v4) | Yes | Yes | Yes | Yes (v4) |
| Auth integration | No | NextAuth | Supabase/Clerk | Clerk | Platform proxy (zero config) |
| Database setup | No | Prisma | Supabase/Prisma | Prisma | Drizzle + own PostgreSQL |
| Multi-tenancy / RLS | No | No | Yes (first-class) | No | Yes (first-class via SDK) |
| Docker support | Example only | No | No | No | Built-in (multi-stage) |
| Health probes | No | No | No | No | Yes (liveness + readiness) |
| CI/CD pipeline | No | No | Partial | No | Yes (GitHub Actions) |
| Local dev automation | No | No | Partial | No | Yes (dev.sh + docker-compose) |
| AI coding instructions | No | No | No | No | Yes (CLAUDE.md) |
| Cost | Free | Free | $299 | $169 | Free (platform-specific) |

**Key insight:** The MadeByKav template competes with $169-$299 paid starters on multi-tenancy and auth, while adding containerization features (Docker, health probes, CI/CD) that none of them provide. The trade-off is that it only works within the MadeByKav platform ecosystem.

## Sources

- [Next.js Official Deployment Docs](https://nextjs.org/docs/app/getting-started/deploying) -- HIGH confidence
- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) -- HIGH confidence
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) -- HIGH confidence
- [Vercel Official Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker) -- HIGH confidence
- [Node.js Reference Architecture: Health Checks](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/) -- HIGH confidence
- [Kubernetes Health Check Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) -- HIGH confidence
- [Builder.io: How to Write a Good CLAUDE.md](https://www.builder.io/blog/claude-md-guide) -- MEDIUM confidence
- [DesignRevision: Best Next.js Boilerplates 2026](https://designrevision.com/blog/best-nextjs-boilerplates) -- MEDIUM confidence
- [Supastarter SaaS Comparison](https://makerkit.dev/saas-starter-kit) -- MEDIUM confidence
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide) -- HIGH confidence
- [Microsoft Engineering Playbook: Onboarding Guide](https://microsoft.github.io/code-with-engineering-playbook/developer-experience/onboarding-guide-template/) -- MEDIUM confidence
- [Cortex Developer Onboarding Guide](https://www.cortex.io/post/developer-onboarding-guide) -- MEDIUM confidence
- APP-TEMPLATE-UPDATE-FINAL.md (project spec) -- HIGH confidence (first-party)

---
*Feature research for: MadeByKav App Template v2*
*Researched: 2026-02-18*
