# Pitfalls Research

**Domain:** Next.js App Template Update (v1 to v2) -- Docker, Tailwind v4, Drizzle ORM 0.45 declarative RLS, CI/CD
**Researched:** 2026-02-18
**Confidence:** MEDIUM-HIGH (verified across official docs, GitHub issues, and multiple community sources)

---

## Critical Pitfalls

Mistakes that cause broken builds, security vulnerabilities, or silent data exposure.

### Pitfall 1: Dockerfile Missing NPM_TOKEN for Private Registry Auth

**What goes wrong:**
The spec's Dockerfile runs `pnpm install --frozen-lockfile` but the `.npmrc` references `@madebykav:registry=https://npm.pkg.github.com`. GitHub Packages requires authentication to install packages. Without a token, `pnpm install` fails with `401 Unauthorized` during Docker build. The Dockerfile in the spec has **no ARG declaration and no secret mount** for the token.

Additionally, the CI/CD workflow passes `NPM_TOKEN` as a `build-args` value, but the Dockerfile never declares `ARG NPM_TOKEN` -- so it would be silently ignored. Even if it did use `ARG`, build args are baked into Docker image layer history and **visible to anyone who inspects the image** via `docker history`.

**Why it happens:**
The `.npmrc` file works on developer machines because `~/.npmrc` contains the auth token globally. In Docker, there is no global npmrc -- only what you provide. The spec appears to assume the `.npmrc` in the repo handles auth, but it only declares the registry scope, not the token.

**How to avoid:**
Use Docker build secrets (BuildKit), not build args, to pass the NPM token:

```dockerfile
# In deps stage:
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile
```

In GitHub Actions:
```yaml
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    secret-files: |
      "npmrc=./.npmrc-ci"
```

Create the `.npmrc-ci` file in a prior step that includes the auth token:
```yaml
- name: Create .npmrc for Docker
  run: |
    echo "@madebykav:registry=https://npm.pkg.github.com" > .npmrc-ci
    echo "//npm.pkg.github.com/:_authToken=${{ secrets.NPM_TOKEN }}" >> .npmrc-ci
```

**Warning signs:**
- `pnpm install` fails during `docker build` with 401/403 errors
- Build works locally but fails in CI
- `docker history` shows your NPM_TOKEN in plaintext (if using ARG approach)

**Phase to address:**
Docker & CI/CD phase. This must be caught during Dockerfile authoring, not after first CI run.

**Confidence:** HIGH -- verified via Docker official docs, npm docs, and GitHub community discussions.

---

### Pitfall 2: `drizzle-kit push` Does Not Apply RLS Policies Correctly

**What goes wrong:**
When using `drizzle-kit push` (the dev workflow command in `dev.sh`), RLS policies defined via `pgPolicy()` in the schema may not be applied correctly. The `USING` and `WITH CHECK` clauses can end up empty, creating policies that allow all access -- silently defeating tenant isolation. This was a documented bug (drizzle-team/drizzle-orm#3504) marked as fixed in beta, but the fix version alignment with drizzle-orm 0.45 (which is pre-v1-beta) is uncertain.

**Why it happens:**
`drizzle-kit push` directly syncs schema to the database without generating SQL files. The RLS policy generation path in `push` had a different code path than `generate`/`migrate`, and the USING clause was not populated. Even if the table and policy name appear in the database, the policy may be a no-op.

**How to avoid:**
1. After running `pnpm db:push`, verify policies are correctly applied:
   ```sql
   SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
   FROM pg_policy WHERE polrelid = 'example_items'::regclass;
   ```
2. If the `using_expr` is null or empty, switch to `generate` + `migrate` workflow:
   ```bash
   pnpm db:generate   # creates SQL migration files
   pnpm db:migrate    # applies them -- this path works correctly
   ```
3. Add a `db:migrate` script to `package.json`: `"db:migrate": "drizzle-kit migrate"`
4. For production, ALWAYS use `generate` + `migrate`, never `push`.

**Warning signs:**
- RLS policy exists but has no USING clause (check via `pg_policy` system catalog)
- Tenant isolation tests pass because no data exists yet, but fail under load
- Different tenants can see each other's data

**Phase to address:**
Schema/database phase. Validate immediately after implementing declarative RLS. Add a verification step to `dev.sh`.

**Confidence:** HIGH -- confirmed via GitHub issue #3504 (closed as fixed-in-beta) and official Drizzle RLS docs. The exact version where the fix lands in stable (non-beta) releases needs validation.

---

### Pitfall 3: Auth SDK Breaking Changes -- Silent Type Mismatches

**What goes wrong:**
The `@madebykav/auth` v0.2.0 SDK has a completely different `AuthContext` shape than v0.1.x. In v1, `getAuthContext()` returned an object with optional properties (`auth?.tenantId`, `auth?.userId`, `auth?.appSlug`). In v2, it returns `AuthContext | null` -- either a fully-populated object or null. The type shape also changed: `appSlug` is removed, `name`, `email`, `role`, and `tenantSlug` are added.

If TypeScript catches this, the build fails (good). But if any code uses `as any` casts, string interpolation, or dynamic property access, the old field names will silently return `undefined` at runtime -- meaning auth context cards show "undefined" and, worse, tenant isolation could break if `tenantId` access patterns changed.

**Why it happens:**
The old SDK was a thin wrapper that exposed raw header values with optional chaining. The new SDK provides a validated, typed context. Code written against the old interface compiles but produces wrong results if types are loosened.

**How to avoid:**
1. Update all usages of `auth?.tenantId` to `auth` null-check pattern: `if (!auth) return ...`
2. Search and replace all `auth?.appSlug` references (removed field)
3. Update all `auth?.userId` to `auth.userId` (non-optional after null check)
4. Add new fields: `auth.name`, `auth.email`, `auth.role`, `auth.tenantSlug`
5. Remove any `AuthContext` type imports and let the SDK provide the type
6. Run `pnpm build` with strict TypeScript -- zero `any` casts in auth code

Specific code changes needed in this codebase:
- `src/app/layout.tsx`: Remove `getAuthContext()` call entirely (forces all pages dynamic)
- `src/app/page.tsx`: Change `auth?.tenantId` pattern to `if (!auth)` guard, remove `auth?.appSlug`
- `src/app/api/example/route.ts`: Already uses `requireAuth()` which is safe

**Warning signs:**
- `auth?.appSlug` renders as "undefined" in the UI
- TypeScript errors about missing properties on `AuthContext`
- Auth context card shows "Not set" for fields that should have values

**Phase to address:**
SDK update phase. This should be done alongside `package.json` dependency updates, not deferred.

**Confidence:** HIGH -- verified against the spec document which explicitly defines the new AuthContext interface and lists the breaking changes.

---

### Pitfall 4: Tailwind v4 @source Directive Not Scanning node_modules

**What goes wrong:**
Tailwind v4 by default ignores `node_modules` when scanning for utility classes. The `@madebykav/ui` package contains components that use Tailwind classes. Without a `@source` directive pointing to the UI package, all classes used only in the UI library will be purged from the final CSS. The result: UI components render with missing styles -- buttons lose backgrounds, cards lose borders, etc.

There is a known GitHub issue (tailwindlabs/tailwindcss#19040) reporting that `@source` does not always scan `node_modules` reliably, particularly in certain build tool configurations.

**Why it happens:**
Tailwind v3 used a `content` array in `tailwind.config.ts` to specify scan paths. Tailwind v4 replaces this with CSS-based `@source` directives. The default auto-detection skips `.gitignore`'d paths (which includes `node_modules`). Developers migrating from v3 may not realize they need `@source` even though they had `content` paths before.

**How to avoid:**
1. Add `@source` directive in `globals.css` right after the Tailwind import:
   ```css
   @import "tailwindcss";
   @import "@madebykav/ui/globals.css";

   @source "../node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}";
   ```
2. The path is relative to the CSS file, not the project root. Since `globals.css` is in `src/app/`, the path needs `../` to reach `node_modules`.
3. Delete `tailwind.config.ts` -- having both the old config and new CSS directives can cause confusion.
4. Test by checking that UI component styles render correctly after build.

**Warning signs:**
- UI components appear unstyled or partially styled after migration
- `pnpm build` succeeds but the visual output is broken
- CSS file is much smaller than expected

**Phase to address:**
Tailwind migration phase. Must be validated visually, not just by build success.

**Confidence:** HIGH -- verified via Tailwind v4 official docs on detecting classes in source files and the known GitHub issue.

---

### Pitfall 5: Next.js Standalone Output Missing public/ and .next/static in Docker

**What goes wrong:**
When `output: 'standalone'` is set in `next.config.ts`, the build output in `.next/standalone/` intentionally excludes the `public/` folder and `.next/static/` directory. These must be manually copied in the Dockerfile. If forgotten, all static assets (images, fonts, favicons) return 404, and JS/CSS bundles fail to load -- the app appears completely broken.

**Why it happens:**
Next.js standalone mode is designed for environments where static assets are served by a CDN. The `server.js` in standalone can serve them if they are placed in the right location, but the build process does not copy them automatically.

**How to avoid:**
The Dockerfile must include explicit COPY commands:
```dockerfile
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
```

The spec's Dockerfile already includes these lines, but this pitfall remains critical because:
1. If someone modifies the Dockerfile and removes these lines, the app silently breaks
2. The `public/` folder COPY must happen even if the folder is empty (otherwise Docker build fails if a future commit adds static assets)
3. The order matters: standalone must be copied first (it sets up the directory structure), then static assets overlay it

**Warning signs:**
- Browser console shows 404 errors for `/_next/static/*` paths
- Favicon, images, and other public assets are missing
- App loads as a blank white page (JS bundle 404)

**Phase to address:**
Docker phase. Add a smoke test in CI that verifies static assets are accessible after container start.

**Confidence:** HIGH -- verified via Next.js official docs on standalone output and multiple GitHub discussions.

---

## Moderate Pitfalls

### Pitfall 6: NEXT_PUBLIC_ Env Vars Frozen at Docker Build Time

**What goes wrong:**
Environment variables prefixed with `NEXT_PUBLIC_` are inlined into the JavaScript bundle during `next build`. In a Docker workflow, this means the values are baked into the image at build time. If you build one image and deploy it to multiple environments (staging, production), all environments will have the same `NEXT_PUBLIC_` values -- those from the build environment.

The spec defines `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_SLUG`. If these are set as Docker build args, they are frozen. If not set at all, they are empty strings in the bundle.

**How to avoid:**
1. For server-only variables (DATABASE_URL, PLATFORM_URL): these are fine -- they are read at runtime via `process.env`.
2. For client-side variables (NEXT_PUBLIC_*): either accept they are build-time only, or use a runtime injection pattern (e.g., a `__ENV.js` script loaded from a server endpoint).
3. For this template, `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_SLUG` are per-app constants that do not change between environments, so build-time freezing is acceptable. Document this explicitly.
4. Never put environment-specific values (API URLs, feature flags) in `NEXT_PUBLIC_` vars if you want a single Docker image across environments.

**Warning signs:**
- Client-side code shows stale or empty environment values
- Different environments show the same app name/slug despite different configs

**Phase to address:**
Docker phase. Document the limitation in README and CLAUDE.md.

**Confidence:** HIGH -- well-documented behavior in Next.js official docs.

---

### Pitfall 7: Corepack + pnpm Version Pinning in Docker Builds

**What goes wrong:**
The spec's Dockerfile uses `corepack prepare pnpm@latest --activate`. This means every Docker build potentially uses a different pnpm version. pnpm versions can introduce breaking changes to lockfile format, dependency resolution, or CLI flags. Additionally, there have been corepack signature verification failures (e.g., NPM registry key rotation in early 2025) that cause `corepack prepare` to fail intermittently.

**Why it happens:**
Using `@latest` for pnpm in Dockerfiles means non-reproducible builds. The lockfile was generated with a specific pnpm version, and a newer version may interpret it differently.

**How to avoid:**
1. Pin pnpm version in `package.json` via `packageManager` field:
   ```json
   "packageManager": "pnpm@9.15.4"
   ```
2. Use corepack without `@latest`:
   ```dockerfile
   RUN corepack enable && corepack prepare --activate
   ```
   Corepack will read the `packageManager` field and install the exact version.
3. Alternatively, install pnpm directly without corepack:
   ```dockerfile
   RUN npm install -g pnpm@9.15.4
   ```

**Warning signs:**
- Docker builds fail intermittently with corepack signature errors
- `pnpm install --frozen-lockfile` fails because lockfile format changed
- Works locally but fails in CI (different pnpm versions)

**Phase to address:**
Docker phase. Pin the version before first CI run.

**Confidence:** MEDIUM -- corepack signature issue is well-documented, pnpm version drift is common knowledge, but the exact failure modes depend on version combinations.

---

### Pitfall 8: drizzle-orm pgTable Third Argument Syntax Change

**What goes wrong:**
The spec uses the array callback syntax for `pgTable`'s third argument:
```typescript
pgTable('example_items', { ... }, (table) => [
  pgPolicy('example_items_tenant_isolation', createTenantPolicy()),
])
```

In drizzle-orm versions before the API change, the third argument used an **object** return syntax:
```typescript
pgTable('example_items', { ... }, (table) => ({
  policy: pgPolicy('example_items_tenant_isolation', createTenantPolicy()),
}))
```

The object syntax is deprecated in newer versions. If you are upgrading from 0.38 to 0.45, the old object syntax may still work but produces deprecation warnings. However, if you copy code from old docs/examples, you may use the wrong syntax.

**Why it happens:**
Drizzle changed the pgTable API to accept an array instead of an object for the third argument. This affects indexes, constraints, and policies. The old syntax is deprecated but not removed in 0.45.

**How to avoid:**
1. Use the array syntax consistently: `(table) => [...]` not `(table) => ({...})`
2. This applies to all pgTable definitions, not just RLS policies -- indexes and constraints too
3. Run `pnpm build` and check for deprecation warnings in the output

**Warning signs:**
- Deprecation warnings about `pgTable` during build
- IDE showing strikethrough on the object syntax
- TypeScript errors if the version requires array syntax

**Phase to address:**
Schema/database phase, when updating `schema.ts`.

**Confidence:** HIGH -- confirmed via Drizzle docs and GitHub issue #3335.

---

### Pitfall 9: Docker HEALTHCHECK Using wget on Alpine Without curl

**What goes wrong:**
The spec's Dockerfile uses `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1`. Alpine images include `wget` by default (via BusyBox), so this works. However, if someone changes the base image to a non-Alpine variant (e.g., `node:20-slim`), `wget` may not be available, causing the healthcheck to always fail. The container will be marked unhealthy and restarted in a loop.

Additionally, the healthcheck runs every 30s by default. If the `/api/health` endpoint does any work (even minimal), this adds continuous load.

**How to avoid:**
1. Stick with Alpine base image (which has wget via BusyBox)
2. Or add `--interval`, `--timeout`, `--retries` flags:
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
     CMD wget -qO- http://localhost:3000/api/health || exit 1
   ```
3. Keep the health endpoint minimal (no DB queries in liveness, only in readiness)

**Warning signs:**
- Container restarts in a loop after image base change
- `docker ps` shows container as "unhealthy"

**Phase to address:**
Docker phase. Minor but can cause production incidents if base image changes.

**Confidence:** HIGH -- straightforward Docker knowledge.

---

### Pitfall 10: Removing db/index.ts Re-exports Breaks Import Paths

**What goes wrong:**
The current template re-exports `withTenant` and `withoutRLS` from `@/lib/db/index.ts`. The spec removes these re-exports, requiring direct imports from `@madebykav/db`. If any code imports `withTenant` from `@/lib/db` instead of `@madebykav/db`, it will fail at build time.

**Why it happens:**
The original template convenience-re-exported SDK functions to simplify imports. The v2 spec removes this to avoid confusion about where functions originate. But existing code (including API routes and page components) may import from the old path.

**How to avoid:**
1. Search all files for `from '@/lib/db'` or `from '../lib/db'` and check what they import
2. Ensure only `db` and schema types are imported from `@/lib/db`
3. Change all `withTenant`, `withoutRLS`, `createTenantPolicy` imports to `from '@madebykav/db'`
4. Do this as a single atomic change -- update all files in one commit

**Warning signs:**
- TypeScript errors: `Module '"@/lib/db"' has no exported member 'withTenant'`
- Build failures after updating `src/lib/db/index.ts`

**Phase to address:**
SDK update phase. Do this alongside the auth SDK changes.

**Confidence:** HIGH -- directly observable from comparing current code to spec.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `build-args` for NPM_TOKEN | Simpler Dockerfile | Token visible in image history | Never in production images |
| Using `drizzle-kit push` in production | No migration files to manage | No rollback path, RLS bugs possible | Only in dev/prototyping |
| `corepack prepare pnpm@latest` | Always latest pnpm | Non-reproducible builds | Never in Dockerfiles |
| Keeping `tailwind.config.ts` alongside CSS directives | Feels safer during migration | Confusing dual config, potential conflicts | Never -- delete after migration |
| Using `NEXT_PUBLIC_` for env-specific values | Easy client-side access | Frozen at build time, single image cannot serve multiple envs | Only for constants that never change per-env |
| Skipping RLS policy verification after `db:push` | Faster dev loop | Silent data leakage if policy is empty | Never -- always verify |

## Integration Gotchas

Common mistakes when connecting components of this template.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Packages in Docker | `.npmrc` in repo has registry scope but no token; Docker build has no access to `~/.npmrc` | Use `--mount=type=secret` to inject a complete `.npmrc` with auth token during build |
| Drizzle + pgPolicy | Assuming `db:push` applies policies same as `db:migrate` | Use `generate` + `migrate` for reliable policy application; verify with `pg_policy` catalog |
| Tailwind v4 + @madebykav/ui | Assuming auto-detection finds classes in `node_modules` | Add explicit `@source` directive; test visually, not just build success |
| Next.js standalone + Docker | Assuming `.next/standalone/` contains everything needed | Explicitly COPY `public/` and `.next/static/` in Dockerfile |
| Auth SDK v0.2.0 + existing pages | Using optional chaining on new non-optional fields | Null-check the entire `auth` object, then access properties directly |
| docker-compose postgres + db:push | Running `db:push` before postgres is ready | Use `pg_isready` wait loop in `dev.sh` (spec already has this) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| NPM_TOKEN in Docker build ARG | Token exposed in image layer history; anyone with image access can extract it | Use Docker build secrets (`--mount=type=secret`) |
| Empty RLS USING clause after `db:push` | All tenants can read all data -- complete tenant isolation failure | Verify policies via `pg_policy` system catalog after every schema push |
| `withoutRLS()` used in app code | Bypasses all tenant isolation; any query returns all tenants' data | Grep codebase for `withoutRLS`; it should only exist in admin/migration scripts |
| `getAuthContext()` in root layout | Forces every page to be dynamic (SSR); also establishes auth context at too broad a scope | Move auth checks to individual pages/routes that need them |
| Hardcoded dev credentials in docker-compose.yml committed to repo | Not a direct security risk (dev-only, local postgres), but sets bad precedent | Acceptable for dev-only compose file with `profiles: [dev]`; never for production |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Dockerfile builds:** Build succeeds but private packages fail at install -- check that `--mount=type=secret` or equivalent token injection is working
- [ ] **RLS policies applied:** Table exists with policy name visible in `\dp` but USING clause is empty -- check `pg_policy` system catalog for actual expressions
- [ ] **Tailwind v4 migration:** Build succeeds and app loads but UI components are unstyled -- check that `@source` directive includes `@madebykav/ui` path
- [ ] **Auth context renders:** Page loads without error but shows "undefined" for new fields -- check that old `auth?.appSlug` references are removed and new fields (`name`, `email`, `role`, `tenantSlug`) are used
- [ ] **Standalone output works:** `docker run` starts server but static assets 404 -- check that `public/` and `.next/static/` are copied in Dockerfile
- [ ] **CI/CD publishes image:** Workflow runs green but image is not pushed -- check that `packages: write` permission is set and GHCR login succeeds
- [ ] **dev.sh works end-to-end:** Script runs but `db:push` fails silently -- check postgres is actually ready before pushing schema (not just container started)
- [ ] **Health endpoints respond:** Liveness returns 200 but readiness returns 503 -- check DATABASE_URL is set and accessible from the container
- [ ] **Env vars available at runtime:** Server-side code reads `process.env.DATABASE_URL` correctly but client-side `NEXT_PUBLIC_*` is empty -- check whether vars were set at build time (they must be for NEXT_PUBLIC_)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| NPM_TOKEN leaked in image | HIGH | Revoke token immediately; rebuild all affected images; rotate to new token; switch to secret mounts |
| Empty RLS policies in production | HIGH | Immediately apply correct policies via manual SQL; audit access logs for data leakage; switch to `generate`+`migrate` workflow |
| Auth SDK type mismatch at runtime | LOW | Fix type errors, redeploy; no data corruption risk |
| Tailwind classes purged | LOW | Add `@source` directive, rebuild; purely visual issue |
| Static assets missing in Docker | LOW | Fix Dockerfile COPY lines, rebuild image |
| Corepack failure in CI | MEDIUM | Pin pnpm version, retry build; may block deployments until fixed |
| docker-compose port conflict (5432 in use) | LOW | Change to alternate port (spec uses 5433, which is correct) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| NPM_TOKEN in Docker | Docker/Dockerfile authoring | `docker history` shows no secrets; CI build installs private packages successfully |
| RLS policies not applied by push | Schema/database migration | Query `pg_policy` catalog; run tenant isolation test |
| Auth SDK breaking changes | SDK dependency update | `pnpm build` passes with zero errors; auth context card shows all 6 fields |
| Tailwind @source for node_modules | Tailwind v4 migration | Visual inspection of UI components; no unstyled elements |
| Standalone missing static files | Docker/Dockerfile authoring | `curl` static asset paths from running container; no 404s |
| NEXT_PUBLIC_ frozen at build time | Docker/documentation | Document in README and CLAUDE.md; verify client-side env rendering |
| Corepack pnpm version drift | Docker/Dockerfile authoring | `packageManager` field in package.json; deterministic CI builds |
| pgTable third arg syntax | Schema update | No deprecation warnings in build output |
| Healthcheck on non-Alpine | Docker/Dockerfile authoring | Container shows "healthy" in `docker ps` |
| Re-export removal breaks imports | SDK update / code migration | `pnpm build` passes; all withTenant imports from `@madebykav/db` |

## Sources

- [Next.js standalone output docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) -- HIGH confidence
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) -- HIGH confidence
- [Drizzle push vs migrate bug #3504](https://github.com/drizzle-team/drizzle-orm/issues/3504) -- HIGH confidence (closed as fixed-in-beta)
- [Drizzle pgTable deprecation #3335](https://github.com/drizzle-team/drizzle-orm/issues/3335) -- HIGH confidence
- [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) -- HIGH confidence
- [Tailwind v4 detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files) -- HIGH confidence
- [Tailwind @source node_modules issue #19040](https://github.com/tailwindlabs/tailwindcss/issues/19040) -- MEDIUM confidence (issue may be resolved)
- [Docker build secrets docs](https://docs.docker.com/build/building/secrets/) -- HIGH confidence
- [Docker build secrets in GitHub Actions](https://docs.docker.com/build/ci/github-actions/secrets/) -- HIGH confidence
- [GitHub community discussion: GITHUB_TOKEN in Docker build #26778](https://github.com/orgs/community/discussions/26778) -- MEDIUM confidence
- [Next.js standalone Docker static assets issue #49283](https://github.com/vercel/next.js/issues/49283) -- HIGH confidence
- [Next.js environment variables guide](https://nextjs.org/docs/pages/guides/environment-variables) -- HIGH confidence
- [Corepack pnpm signature verification issue](https://github.com/payloadcms/payload/issues/11037) -- MEDIUM confidence
- [Drizzle ORM v1 upgrade guide](https://orm.drizzle.team/docs/upgrade-v1) -- MEDIUM confidence (v1 beta, spec uses 0.45)
- [Optimizing Next.js Docker with PNPM and standalone](https://htalbot.dev/posts/build-nextjs-standalone-docker) -- MEDIUM confidence

---
*Pitfalls research for: MadeByKav App Template v2 Update*
*Researched: 2026-02-18*
