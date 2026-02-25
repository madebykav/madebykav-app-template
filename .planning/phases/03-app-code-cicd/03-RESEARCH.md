# Phase 3: App Code & CI/CD - Research

**Researched:** 2026-02-25
**Domain:** Next.js app code updates (auth SDK v0.2.0 breaking changes), server actions, GitHub Actions CI/CD for Docker image publishing
**Confidence:** HIGH

## Summary

Phase 3 applies the auth SDK v0.2.0 breaking changes to the app code, creates a logout server action, and sets up a GitHub Actions CI/CD pipeline that builds and pushes Docker images to GHCR on push to main. All five requirements (APP-01, APP-02, APP-03, AUTH-01, CICD-01) have exact target implementations defined in the spec (`APP-TEMPLATE-UPDATE-FINAL.md`).

The app code changes are straightforward: (1) remove `getAuthContext()` from `layout.tsx` to stop forcing every page dynamic, (2) update `page.tsx` to use the new AuthContext null-check pattern and display the new fields (name, email, role, tenantSlug), (3) update the API example route to use `satisfies NewExampleItem` for better type checking, and (4) create a logout server action that redirects to the platform's `/logout` endpoint. The CI/CD workflow is the only net-new file creation -- a `docker-publish.yml` that uses standard Docker GitHub Actions with BuildKit secrets to match the existing Dockerfile's secret mount pattern.

The critical implementation detail is that the Dockerfile already uses `--mount=type=secret,id=GITHUB_TOKEN`, so the GitHub Actions workflow must pass the secret using the `secrets` input of `docker/build-push-action`, NOT `build-args`. The spec's example workflow uses `build-args: NPM_TOKEN=...` which contradicts the Dockerfile's BuildKit secret mount pattern established in Phase 2.

**Primary recommendation:** Follow the spec for app code changes verbatim. For the CI/CD workflow, use the spec's structure but replace the `build-args` approach with the `secrets` input to match the Dockerfile's BuildKit secret mount pattern. Use `docker/build-push-action@v6` (latest) instead of `@v5` from the spec.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APP-01 | Remove `getAuthContext()` call from root `layout.tsx` (forces every page dynamic) | Current `layout.tsx` imports `getAuthContext` and calls it on line 17. The function is async and reads headers, which forces all pages under this layout to be dynamic (no static optimization). The fix is to remove the import, remove the call, and make the function non-async. Spec provides exact target code. |
| APP-02 | Update `page.tsx` to new AuthContext shape (null check, `auth.name`, `auth.email`, `auth.role`, `auth.tenantSlug`) | Current `page.tsx` uses `auth?.tenantId` optional chaining pattern. With auth SDK v0.2.0, `getAuthContext()` returns `AuthContext | null` (not an object with optional fields). The null check becomes `if (!auth)` with early return. Auth context card must show `tenantSlug`, `role`, `email`, `userId`. Welcome message uses `auth.name \|\| auth.email`. Spec provides exact target code. |
| APP-03 | Update API example route with `NewExampleItem` type usage | Current `route.ts` uses `const newItem: NewExampleItem = {...}` variable assignment. Spec uses inline `{...} satisfies NewExampleItem` for tighter type checking (catches excess properties). The `satisfies` operator is available in TypeScript 5.x (project uses ^5.7.3). Minor change but improves type safety. |
| AUTH-01 | Create logout server action (redirects to platform `/logout` endpoint) | New file at `src/app/actions/auth.ts`. Uses Next.js `redirect()` from `next/navigation` which supports absolute URLs for external redirects (verified in official docs). The redirect target is `${process.env.PLATFORM_URL \|\| 'https://madebykav.com'}/logout`. When called from a server action, `redirect()` returns a 303 HTTP response. Must be called outside try/catch blocks as it throws a `NEXT_REDIRECT` error. |
| CICD-01 | Create GitHub Actions workflow (`docker-publish.yml`) to build and push Docker image to GHCR on push to main | New file at `.github/workflows/docker-publish.yml`. Uses `docker/login-action@v3`, `docker/metadata-action@v5`, and `docker/build-push-action@v6`. Must pass GITHUB_TOKEN as a BuildKit secret (matching Dockerfile's `--mount=type=secret,id=GITHUB_TOKEN`) via the `secrets` input. Tags: SHA + latest on default branch. Requires `packages: write` permission. |
</phase_requirements>

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| @madebykav/auth | ^0.2.0 (installed) | Auth context with new AuthContext shape | Already installed in Phase 1; provides typed `AuthContext \| null` return from `getAuthContext()` |
| Next.js | ^15.1.6 (installed) | App framework, server actions, redirect | `redirect()` supports external URLs; server actions use `'use server'` directive |
| TypeScript | ^5.7.3 (installed) | Type system with `satisfies` operator | `satisfies` available since TS 4.9; used for inline type checking in API route |
| docker/build-push-action | @v6 | GitHub Actions Docker build | Latest major version; supports `secrets` input for BuildKit secret mounts |
| docker/metadata-action | @v5 | Docker image tag/label extraction | Generates SHA and latest tags from Git metadata |
| docker/login-action | @v3 | GHCR authentication | Standard registry login action for GitHub Actions |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `redirect()` from `next/navigation` | Next.js 15 | External URL redirect in server actions | Logout action redirects to platform `/logout` endpoint |
| `actions/checkout` | @v4 | Repository checkout in CI | Every GitHub Actions workflow needs repository access |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `docker/build-push-action@v6` | `docker/build-push-action@v5` (spec default) | v6 is current latest; v5 still works but v6 has better BuildKit integration and performance improvements |
| `secrets` input | `build-args` input (spec default) | Spec uses `build-args: NPM_TOKEN=...` but Dockerfile uses BuildKit `--mount=type=secret,id=GITHUB_TOKEN`. Using `secrets` input matches the Dockerfile pattern and avoids leaking tokens into image layers. |
| `satisfies NewExampleItem` | `const newItem: NewExampleItem = {...}` (current) | `satisfies` catches excess properties and preserves literal types; variable annotation allows excess properties. Minor but better DX. |

**Installation:**
No new npm packages needed. All app code changes use existing dependencies. The CI/CD workflow uses GitHub-hosted runner actions.

## Architecture Patterns

### Recommended File Structure (New Files)

```
src/
├── app/
│   ├── layout.tsx              # MODIFY: remove getAuthContext() call
│   ├── page.tsx                # MODIFY: new AuthContext null-check pattern
│   ├── actions/
│   │   └── auth.ts             # CREATE: logout server action
│   └── api/
│       └── example/
│           └── route.ts        # MODIFY: satisfies NewExampleItem
.github/
└── workflows/
    └── docker-publish.yml      # CREATE: CI/CD pipeline
```

### Pattern 1: AuthContext Null-Check (v0.2.0 Breaking Change)

**What:** The auth SDK v0.2.0 changed `getAuthContext()` to return `AuthContext | null` instead of an object with optional fields. Code must use a null check (`if (!auth)`) instead of optional chaining (`auth?.tenantId`).

**When to use:** Every page/component that calls `getAuthContext()`.

**Before (v0.1.0):**
```typescript
const auth = await getAuthContext()
if (auth?.tenantId) {
  // tenantId might still be undefined
}
```

**After (v0.2.0):**
```typescript
// Source: @madebykav/auth v0.2.0 dist/index.d.ts
const auth = await getAuthContext()
if (!auth) {
  return <NotAuthenticated />
}
// auth is AuthContext -- all fields guaranteed non-null
// auth.tenantId, auth.userId, auth.email, auth.name, auth.role, auth.tenantSlug
```

### Pattern 2: Server Action with External Redirect

**What:** A server action that uses `redirect()` to send the user to an external URL (the platform's logout endpoint).

**When to use:** Logout, OAuth flows, or any server-side redirect to an external service.

**Example:**
```typescript
// Source: Next.js docs - redirect() supports absolute URLs
'use server'

import { redirect } from 'next/navigation'

export async function logout() {
  redirect(`${process.env.PLATFORM_URL || 'https://madebykav.com'}/logout`)
}
```

**Key facts:**
- `redirect()` supports absolute URLs for external redirects (verified in official Next.js docs)
- In server actions, `redirect()` returns a 303 HTTP response
- `redirect()` throws a `NEXT_REDIRECT` error -- do NOT wrap in try/catch
- The function has return type `never` -- no `return` keyword needed before it

### Pattern 3: GitHub Actions Docker Build with BuildKit Secrets

**What:** A CI/CD workflow that builds a Docker image using BuildKit secret mounts and pushes to GHCR with SHA + latest tags.

**When to use:** Any project with a Dockerfile that uses `--mount=type=secret` for private package auth.

**Example:**
```yaml
# Source: docker/build-push-action docs, Docker BuildKit secrets docs
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    secrets: |
      "GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}"
```

**Key facts:**
- The `secrets` input maps to BuildKit's `--secret` flag
- Secret names must match the `id` in the Dockerfile's `--mount=type=secret,id=NAME`
- The Dockerfile uses `id=GITHUB_TOKEN`, so the workflow secret must be named `GITHUB_TOKEN`
- `secrets.GITHUB_TOKEN` is automatically available in GitHub Actions (no manual secret configuration needed for the workflow)
- However, installing @madebykav packages requires a PAT with `read:packages` scope -- the automatic `GITHUB_TOKEN` only has access to the current repository's packages

### Pattern 4: TypeScript `satisfies` for Inline Type Checking

**What:** Using `satisfies` operator instead of variable type annotation for tighter type checking.

**When to use:** When passing an object literal to a function and you want excess property checking.

**Before:**
```typescript
const newItem: NewExampleItem = {
  tenantId: auth.tenantId,
  title,
  description,
  priority: priority ?? 0,
}
return tx.insert(exampleItems).values(newItem).returning()
```

**After:**
```typescript
// Source: APP-TEMPLATE-UPDATE-FINAL.md §9
return tx.insert(exampleItems).values({
  tenantId: auth.tenantId,
  title,
  description,
  priority: priority ?? 0,
} satisfies NewExampleItem).returning()
```

### Anti-Patterns to Avoid

- **Calling `getAuthContext()` in root layout:** Forces every page in the app to be dynamic (no static optimization). Auth should be checked per-page, not at the layout level.
- **Using `build-args` for GITHUB_TOKEN in CI/CD:** The Dockerfile uses BuildKit secret mounts (`--mount=type=secret`). Using `build-args` would require changing the Dockerfile AND leak the token into image layers.
- **Wrapping `redirect()` in try/catch:** The `redirect()` function throws a `NEXT_REDIRECT` error internally. Catching it prevents the redirect from working.
- **Using the auto-provided `secrets.GITHUB_TOKEN` for private cross-repo packages:** The automatic GITHUB_TOKEN only has scope for the current repository. Installing @madebykav packages from the GitHub npm registry requires a PAT with `read:packages` scope, stored as a repository secret.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker image tagging | Manual SHA extraction and tag construction | `docker/metadata-action@v5` with `type=sha` and `type=raw,value=latest` | Handles edge cases (tag formats, branch detection, multi-tag), well-tested |
| GHCR authentication | Manual `docker login` command | `docker/login-action@v3` | Handles token masking, error handling, and registry URL normalization |
| External redirect from server action | Manual `Response.redirect()` or client-side `window.location` | `redirect()` from `next/navigation` | Works correctly with Next.js streaming, sets proper 303 status, handles history stack |
| Auth context type guard | Custom type narrowing function | Null check on `getAuthContext()` return | SDK returns `AuthContext | null` -- standard null check is sufficient |

**Key insight:** This phase is primarily about adopting the correct patterns from the SDK and spec. The only genuinely new creation is the CI/CD workflow file, and even that follows a well-established pattern with standard Docker GitHub Actions.

## Common Pitfalls

### Pitfall 1: `getAuthContext()` in Layout Forces All Pages Dynamic

**What goes wrong:** Every page under the root layout becomes a dynamic server-rendered page, even pages that could be statically generated.
**Why it happens:** `getAuthContext()` reads request headers, which can only happen at request time. When called in a layout, Next.js marks all child routes as dynamic.
**How to avoid:** Remove the `getAuthContext()` call from `layout.tsx`. Call it in individual pages that need auth context.
**Warning signs:** No pages are statically optimized; every page shows as "dynamic" in build output.

### Pitfall 2: Optional Chaining on AuthContext (v0.2.0 Breaking Change)

**What goes wrong:** Code continues to use `auth?.tenantId` instead of `!auth` null check. While this may not cause runtime errors, it misses TypeScript's type narrowing -- after the null check, all fields are guaranteed present.
**Why it happens:** Developers carry over the v0.1.0 pattern where AuthContext had optional fields.
**How to avoid:** Use `if (!auth) { return ... }` as the guard. After this check, TypeScript narrows the type to `AuthContext` with all fields required.
**Warning signs:** TypeScript errors about potentially undefined properties on AuthContext fields.

### Pitfall 3: Spec's CI/CD Workflow Uses `build-args` Instead of `secrets`

**What goes wrong:** The spec's `docker-publish.yml` uses `build-args: NPM_TOKEN=${{ secrets.NPM_TOKEN }}` but the Dockerfile uses `--mount=type=secret,id=GITHUB_TOKEN`. These are incompatible -- build-args become `ARG` in the Dockerfile, secrets become `--mount=type=secret`.
**Why it happens:** The spec was written before the Dockerfile was finalized with BuildKit secrets in Phase 2.
**How to avoid:** Use the `secrets` input of `docker/build-push-action` instead of `build-args`. The secret name must match: `GITHUB_TOKEN` (matching the Dockerfile's `--mount=type=secret,id=GITHUB_TOKEN`).
**Warning signs:** Docker build fails with "secret not found" or "GITHUB_TOKEN: no such file or directory" during pnpm install.

### Pitfall 4: GITHUB_TOKEN Scope for Private Package Registry

**What goes wrong:** The workflow uses `secrets.GITHUB_TOKEN` (auto-provided) but this token only has access to the current repository's packages. Installing `@madebykav/*` packages from a different repository's npm registry fails with 401.
**Why it happens:** GitHub's automatic `GITHUB_TOKEN` is scoped to the repository where the workflow runs. Cross-repo package access requires a PAT.
**How to avoid:** Create a repository secret (e.g., `GH_PACKAGES_TOKEN` or `NPM_TOKEN`) containing a PAT with `read:packages` scope. Use this secret in the workflow's `secrets` input for the Docker build step. However, note that the automatic `GITHUB_TOKEN` may work if the packages are in the same organization and the repo has access -- this depends on the organization's package access settings.
**Warning signs:** 401 Unauthorized errors during `pnpm install` in the Docker build step of the CI workflow.

### Pitfall 5: `redirect()` Inside try/catch Block

**What goes wrong:** The logout server action wraps `redirect()` in a try block. The redirect throws a `NEXT_REDIRECT` error which gets caught, and the redirect never happens.
**Why it happens:** Standard error handling instinct to wrap server operations in try/catch.
**How to avoid:** Call `redirect()` outside any try/catch block. The spec's logout action is simple enough that no try/catch is needed.
**Warning signs:** Logout button appears to do nothing; no redirect occurs.

### Pitfall 6: Missing `.github/workflows/` Directory

**What goes wrong:** The `docker-publish.yml` file is created but GitHub Actions doesn't detect it because the directory path is wrong.
**Why it happens:** The `.github` directory doesn't exist yet in this repository (verified: no `.github/` directory found).
**How to avoid:** Create the full directory path: `.github/workflows/` before writing the workflow file.
**Warning signs:** No workflow appears in the GitHub Actions tab after push.

## Code Examples

Verified patterns from the spec and official sources:

### layout.tsx (APP-01) -- Remove Auth Call

```typescript
// Source: APP-TEMPLATE-UPDATE-FINAL.md §7
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'App Template | MadeByKav',
  description: 'A template for building apps on the MadeByKav platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
```

**Key changes from current:**
- Remove `import { getAuthContext } from '@madebykav/auth'`
- Remove `const auth = await getAuthContext()` call
- Function is no longer `async`
- Body classes add `bg-background text-foreground antialiased`
- Remove auth-related comments

### page.tsx (APP-02) -- New AuthContext Shape

```typescript
// Source: APP-TEMPLATE-UPDATE-FINAL.md §8
import { getAuthContext } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { Button, Card } from '@madebykav/ui'
import { db } from '@/lib/db'
import { exampleItems } from '@/lib/db/schema'

export default async function DashboardPage() {
  const auth = await getAuthContext()

  if (!auth) {
    return (
      <main className="container mx-auto p-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Not Authenticated</h2>
          <p className="text-muted-foreground">
            Please log in through the platform portal.
          </p>
        </Card>
      </main>
    )
  }

  const items = await withTenant(db, auth.tenantId, async (tx) => {
    return tx.select({
      id: exampleItems.id,
      title: exampleItems.title,
      status: exampleItems.status,
    }).from(exampleItems).limit(5)
  })

  return (
    <main className="container mx-auto p-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {auth.name || auth.email}
          </p>
        </div>

        {/* Auth Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Context</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tenant:</span>
              <p className="font-mono">{auth.tenantSlug}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span>
              <p className="font-mono">{auth.role}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User:</span>
              <p className="font-mono">{auth.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User ID:</span>
              <p className="font-mono text-xs">{auth.userId}</p>
            </div>
          </div>
        </Card>

        {/* Stats + Actions + Items cards unchanged */}
      </div>
    </main>
  )
}
```

**Key changes from current:**
- Null check: `if (!auth)` replaces `if (auth?.tenantId)` with early return showing "Not Authenticated"
- Welcome message: `Welcome, {auth.name || auth.email}` (uses new fields)
- Auth card shows: `tenantSlug`, `role`, `email`, `userId` (replaces `tenantId`, `tenantSlug`, `userId`, status)
- No more optional chaining on auth fields after null check
- `withTenant` call moved after null check (no conditional `if (auth?.tenantId)` wrapper needed)

### API Example Route (APP-03) -- `satisfies` Pattern

```typescript
// Source: APP-TEMPLATE-UPDATE-FINAL.md §9
// POST handler change only:
const [item] = await withTenant(db, auth.tenantId, async (tx) => {
  return tx.insert(exampleItems).values({
    tenantId: auth.tenantId,
    title,
    description,
    priority: priority ?? 0,
  } satisfies NewExampleItem).returning()
})
```

**Key changes from current:**
- Replace `const newItem: NewExampleItem = {...}` variable with inline `{...} satisfies NewExampleItem`
- Removes intermediate variable declaration
- `satisfies` provides stricter type checking than variable annotation

### Logout Server Action (AUTH-01)

```typescript
// Source: APP-TEMPLATE-UPDATE-FINAL.md §12
'use server'

import { redirect } from 'next/navigation'

export async function logout() {
  redirect(`${process.env.PLATFORM_URL || 'https://madebykav.com'}/logout`)
}
```

**Key facts:**
- File location: `src/app/actions/auth.ts`
- The `'use server'` directive marks this as a server action
- `redirect()` with an absolute URL performs an external redirect
- `PLATFORM_URL` env var is already in `.env.example` with default `https://madebykav.com`
- No try/catch needed -- `redirect()` throws `NEXT_REDIRECT` internally

### CI/CD Workflow (CICD-01)

```yaml
# Source: APP-TEMPLATE-UPDATE-FINAL.md §20 (adapted for BuildKit secrets)
name: Build and Publish Docker Image

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          secrets: |
            "GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}"
```

**Key differences from spec:**
- Uses `docker/build-push-action@v6` instead of `@v5`
- Uses `secrets` input instead of `build-args` to match Dockerfile's `--mount=type=secret,id=GITHUB_TOKEN`
- Secret name is `GITHUB_TOKEN` (matching Dockerfile) instead of `NPM_TOKEN`
- Removed `build-args` entirely

**GITHUB_TOKEN scope consideration:**
The automatic `secrets.GITHUB_TOKEN` has `packages: write` permission (set in the workflow). For GHCR login, this is sufficient. For installing `@madebykav/*` packages during Docker build, the automatic token may or may not work depending on organization package visibility settings. If cross-repo package access fails, a separate repository secret with a PAT that has `read:packages` scope would be needed. The planner should consider whether to use the automatic token initially and document the fallback.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getAuthContext()` returns `{ tenantId?: string, userId?: string, ... }` | Returns `AuthContext \| null` | @madebykav/auth v0.2.0 | Null check replaces optional chaining; all fields guaranteed after check |
| `const x: Type = {...}` variable annotation | `{...} satisfies Type` inline | TypeScript 4.9 (Nov 2022) | Stricter type checking, catches excess properties, preserves literal types |
| `docker/build-push-action@v5` | `docker/build-push-action@v6` | 2024 | Better BuildKit integration, improved caching, secrets handling |
| `build-args` for Docker secrets | `secrets` input with BuildKit mounts | docker/build-push-action v4+ | Secrets never persist in image layers |
| Auth in root layout | Auth per-page | Best practice (always) | Prevents forcing all pages dynamic; enables static optimization |

**Deprecated/outdated:**
- `auth?.tenantId` optional chaining pattern: Replaced by null check in v0.2.0
- `auth.appSlug`: Removed from AuthContext in v0.2.0; replaced by `auth.tenantSlug`
- `build-args: NPM_TOKEN=...` in CI/CD: Replaced by BuildKit `secrets` input

## Open Questions

1. **GITHUB_TOKEN scope for cross-repo packages**
   - What we know: The automatic `secrets.GITHUB_TOKEN` is scoped to the current repository. `@madebykav/*` packages are published from a different repository (`madebykav/madebykav-platform`).
   - What's unclear: Whether the organization's package settings allow the automatic token to read packages from other repos in the same org. GitHub's documentation says organization packages can be configured to allow access from all repos in the org.
   - Recommendation: Start with `secrets.GITHUB_TOKEN` in the workflow. If the Docker build fails with 401 during `pnpm install`, create a repository secret with a PAT. Document this as a setup requirement. **Confidence: MEDIUM** -- depends on GitHub org settings that cannot be verified from here.

2. **Workflow trigger: should PR builds be included?**
   - What we know: The spec says `on: push: branches: [main]` plus `workflow_dispatch`. This means only pushes to main trigger the workflow.
   - What's unclear: Whether PR builds (build without push) would be valuable for validation before merge.
   - Recommendation: Follow the spec -- push-to-main only. PR validation can be added later as a separate concern. The success criteria explicitly says "push to main triggers automated Docker image build and push to GHCR." **Confidence: HIGH** -- matches success criteria exactly.

3. **Should the logout action be wired to a UI button in this phase?**
   - What we know: AUTH-01 says "Create logout server action" and the success criterion says "Logout server action redirects to platform /logout endpoint." Neither explicitly requires a logout button in the UI.
   - What's unclear: Whether the action alone is sufficient or if it needs to be wired to a button.
   - Recommendation: Create the server action file only. Wiring it to a UI button is a separate concern. The success criteria can be verified by confirming the file exists with the correct redirect logic. **Confidence: HIGH** -- the requirement is about the action, not the UI.

## Sources

### Primary (HIGH confidence)
- `APP-TEMPLATE-UPDATE-FINAL.md` -- Complete spec with exact file contents for all changes (sections 7, 8, 9, 12, 20)
- `@madebykav/auth` v0.2.0 `dist/index.d.ts` -- Verified AuthContext interface: `{ tenantId, userId, email, name, role, tenantSlug }`, `getAuthContext()` returns `AuthContext | null`
- [Next.js `redirect()` docs](https://nextjs.org/docs/app/api-reference/functions/redirect) -- Confirmed: supports absolute URLs, returns 303 in server actions, throws `NEXT_REDIRECT` error
- [Docker BuildKit secrets in GitHub Actions](https://docs.docker.com/build/ci/github-actions/secrets/) -- `secrets` input syntax for `docker/build-push-action`
- [docker/build-push-action repository](https://github.com/docker/build-push-action) -- v6 is current latest; `secrets` input accepts `key=value` pairs
- [docker/metadata-action repository](https://github.com/docker/metadata-action) -- `type=sha` generates `sha-XXXXXXX` tag; `type=raw,value=latest,enable={{is_default_branch}}` for latest tag

### Secondary (MEDIUM confidence)
- [docker/login-action repository](https://github.com/docker/login-action) -- v3 is current stable for GHCR login
- Phase 1 and Phase 2 summaries -- Confirmed current codebase state (what was implemented and committed)
- [Docker BuildKit secrets documentation](https://docs.docker.com/build/building/secrets/) -- Secret mount mechanics

### Tertiary (LOW confidence)
- GITHUB_TOKEN automatic scope for cross-org packages -- Community discussions suggest it works with org settings but cannot verify without access to the GitHub org settings panel

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All tools (Docker actions, Next.js redirect, TypeScript satisfies) are well-documented and verified
- Architecture: HIGH -- Code patterns come directly from the spec with SDK type definitions verified
- Pitfalls: HIGH -- BuildKit secret mismatch between spec and Dockerfile verified by reading both files; redirect behavior verified in official docs; GITHUB_TOKEN scope is a known concern documented in GitHub docs
- CI/CD workflow: HIGH -- Docker GitHub Actions are mature (v3/v5/v6) with extensive documentation

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable -- spec is fixed, Docker actions versioned, auth SDK pinned)
