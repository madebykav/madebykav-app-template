# MadeByKav App Template

A starter template for building apps on the MadeByKav platform.

## Quick Start

### 1. Create from Template

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

To create a token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `read:packages` scope
3. Copy the token and use it in the command above

### 3. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - Your platform database connection string
- `PLATFORM_URL` - Platform URL (default: https://madebykav.com)

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Customization

### Update App Identity

1. Edit `package.json`:
   - Change `name` to `@madebykav/your-app-name`

2. Edit `src/app/layout.tsx`:
   - Update metadata (title, description)

3. Edit `.env.local`:
   - Set `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_SLUG`

### Add Database Tables

1. Create schema in `src/lib/db/schema.ts`:
   ```typescript
   export const myTable = pgTable('myapp_items', {
     id: uuid('id').defaultRandom().primaryKey(),
     tenantId: uuid('tenant_id').notNull(),
     // your columns...
   })
   ```

2. Push to database:
   ```bash
   pnpm db:push
   ```

3. Apply RLS policy (in database):
   ```sql
   SELECT create_tenant_policy('myapp_items');
   ```

### Use Platform UI Components

```typescript
import { Button, Card, Input } from '@madebykav/ui'

<Button variant="default">Click me</Button>
<Card className="p-6">Content</Card>
<Input placeholder="Enter text..." />
```

### Add AI Capabilities

```typescript
import { chat } from '@madebykav/ai'

const response = await chat({
  messages: [{ role: 'user', content: 'Hello' }],
})
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout with auth
│   ├── page.tsx        # Dashboard page
│   └── api/            # API routes
├── lib/
│   └── db/             # Database configuration
│       ├── index.ts    # Connection setup
│       └── schema.ts   # Table definitions
└── components/         # Your components (create as needed)
```

## SDK Packages

| Package | Purpose |
|---------|---------|
| `@madebykav/auth` | Authentication (session, user, tenant) |
| `@madebykav/db` | Database helpers (tenant isolation) |
| `@madebykav/ui` | UI components (buttons, cards, etc.) |
| `@madebykav/ai` | AI chat capabilities |

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm db:generate` | Generate database migrations |
| `pnpm db:push` | Push schema to database |

## Important: Tenant Isolation

**All data queries must go through `withTenant()`** to ensure tenant isolation:

```typescript
import { withTenant } from '@madebykav/db'
import { requireAuth } from '@madebykav/auth'

const auth = await requireAuth()
const data = await withTenant(db, auth.tenantId, async (tx) => {
  return tx.select().from(myTable)
})
```

## AI Development

This template includes a `CLAUDE.md` file with comprehensive context for AI-assisted development. Open it to see patterns, examples, and guidelines.

## License

Private - MadeByKav Platform
