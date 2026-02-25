# MadeByKav App Template

A tenant-isolated Next.js app template for the MadeByKav platform. Each app runs as a Docker container, accessible at `{app-slug}.madebykav.com`, with authentication handled at the proxy layer and data isolation via Row-Level Security.

## Quick Start

### 1. Clone or Use as Template

Click "Use this template" on GitHub, or clone directly:

```bash
git clone https://github.com/madebykav/madebykav-app-template.git my-app
cd my-app
rm -rf .git && git init
```

### 2. Configure GitHub Packages Authentication

The SDK packages are hosted on GitHub Packages. Add your GitHub token to `~/.npmrc`:

```bash
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

To create a token: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic) > Generate with `read:packages` scope.

### 3. Configure Environment

```bash
cp .env.example .env.local
```

### 4. Install and Run

```bash
pnpm install
./dev.sh
```

`./dev.sh` starts a local PostgreSQL container (port 5433), pushes the database schema, and starts the Next.js dev server. Open [http://localhost:3000](http://localhost:3000).

**Manual alternative:** `docker compose --profile dev up -d && pnpm db:push && pnpm dev`

## Deployment

### Vercel

Connect the repo in Vercel, set environment variables (`DATABASE_URL`, `PLATFORM_URL`), and push to deploy.

### Docker

Build the image using BuildKit secrets (keeps `GITHUB_TOKEN` out of image layers):

```bash
docker build --secret id=GITHUB_TOKEN,env=GITHUB_TOKEN -t my-app .
```

The platform admin registers the app, creates a stack with the Docker image, and deploys via the admin panel. The app becomes accessible at `{app-slug}.madebykav.com`.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (synchronous, no auth call)
│   ├── page.tsx                    # Dashboard page
│   ├── globals.css                 # Tailwind v4 + UI theme imports
│   ├── actions/
│   │   └── auth.ts                 # Logout server action
│   └── api/
│       ├── example/
│       │   └── route.ts            # Example CRUD endpoints
│       └── health/
│           ├── route.ts            # Liveness probe
│           └── ready/route.ts      # Readiness probe
├── lib/
│   └── db/
│       ├── index.ts                # Drizzle connection
│       └── schema.ts               # Tables with declarative RLS policies
└── components/                     # App components (create as needed)
```

## SDK Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@madebykav/auth` | ^0.2.0 | Read identity from platform proxy headers |
| `@madebykav/db` | ^0.1.0 | RLS tenant isolation (`withTenant`, `createTenantPolicy`) |
| `@madebykav/ui` | ^0.1.2 | Shared UI components (Button, Card, Input, etc.) |
| `@madebykav/ai` | optional | AI capabilities (add when needed: `pnpm add @madebykav/ai`) |

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:push` | Push schema to database |
| `./dev.sh` | One-command dev setup (postgres + schema + dev server) |
| `docker build --secret id=GITHUB_TOKEN,env=GITHUB_TOKEN -t app .` | Build Docker image |

## Tenant Isolation

All data is multi-tenant via Row-Level Security. Every table has a `tenant_id` column, and all queries must go through `withTenant()`:

```typescript
import { requireAuth } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'
import { db } from '@/lib/db'
import { myTable } from '@/lib/db/schema'

const auth = await requireAuth()
const data = await withTenant(db, auth.tenantId, async (tx) => {
  return tx.select().from(myTable)
})
```

RLS policies are defined declaratively in the schema using `pgPolicy()` + `createTenantPolicy()` -- no manual SQL required.

## Health Probes

- **`GET /api/health`** -- Liveness probe. Returns `{ status: 'ok' }`. Does not check database (prevents restart loops).
- **`GET /api/health/ready`** -- Readiness probe. Returns `{ status: 'ready' }` after verifying database connectivity. Returns 503 if DB is unreachable.

## AI Development

See [CLAUDE.md](CLAUDE.md) for AI development context, code patterns, and guidelines.

## License

Private -- MadeByKav Platform
