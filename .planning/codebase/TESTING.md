# Testing Patterns

**Analysis Date:** 2026-02-18

## Test Framework

**Runner:**
- Not currently configured in template
- Recommended: Vitest (lightweight, Fast Refresh compatible) or Jest
- Next.js documentation recommends Jest or Vitest for app router projects

**Assertion Library:**
- Not currently configured in template
- Recommended: Vitest with built-in assertions or Jest with `@testing-library/react`

**Run Commands:**
```bash
# Not yet implemented in this template
# Future configuration would add:
# pnpm test              # Run all tests
# pnpm test:watch       # Watch mode
# pnpm test:coverage    # Coverage report
```

## Test File Organization

**Location:**
- **Not currently implemented** - Template has no existing test files
- Recommended pattern: Co-locate tests with source
  - `src/app/page.test.tsx` alongside `src/app/page.tsx`
  - `src/lib/db/schema.test.ts` alongside `src/lib/db/schema.ts`
  - API route tests: `src/app/api/example/route.test.ts`

**Naming:**
- Use `.test.ts` or `.test.tsx` extension
- Example: `DashboardPage.test.tsx`, `schema.test.ts`, `route.test.ts`

**Structure:**
```
src/
├── app/
│   ├── page.tsx
│   ├── page.test.tsx           # Component tests
│   ├── layout.tsx
│   ├── layout.test.tsx
│   └── api/
│       └── example/
│           ├── route.ts
│           └── route.test.ts   # API endpoint tests
└── lib/
    └── db/
        ├── schema.ts
        ├── schema.test.ts      # Schema validation tests
        └── index.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
// Recommended pattern for Next.js 13+ with Vitest
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requireAuth } from '@madebykav/auth'
import { withTenant } from '@madebykav/db'

describe('GET /api/example', () => {
  describe('authentication', () => {
    it('should throw 401 if not authenticated', async () => {
      // Test requires auth
    })

    it('should return items for authenticated user', async () => {
      // Test successful response
    })
  })

  describe('data isolation', () => {
    it('should only return items for current tenant', async () => {
      // Test withTenant isolation
    })
  })
})
```

**Patterns:**
- Organize tests by functionality using nested `describe()` blocks
- Use `beforeEach()` for test setup
- Use `afterEach()` for cleanup (database transactions, mocks)
- Group related test cases hierarchically

## Mocking

**Framework:**
- Recommended: Vitest's built-in mocking with `vi.mock()`
- Alternative: Jest with `jest.mock()`

**Patterns:**
```typescript
// Mock SDK packages
import { vi } from 'vitest'

// Mock authentication
vi.mock('@madebykav/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { id: 'test-session-id' },
  }),
  getAuthContext: vi.fn().mockResolvedValue({
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { id: 'test-session-id' },
  }),
}))

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  withTenant: vi.fn().mockImplementation((db, tenantId, callback) => {
    return callback(mockTransaction)
  }),
}))
```

**What to Mock:**
- External SDK calls (`@madebykav/auth`, `@madebykav/db`)
- Database operations (return fixtures instead of querying)
- API dependencies (Stripe, external services)
- Date/time for predictable snapshots

**What NOT to Mock:**
- Internal utilities in same module (test actual behavior)
- Environment configuration
- Next.js runtime functions (`NextResponse`, `NextRequest`)
- Drizzle type system (mock at database level instead)

## Fixtures and Factories

**Test Data:**
```typescript
// Recommended: Factory pattern for test data
const createTestItem = (overrides = {}) => ({
  id: 'test-item-id',
  tenantId: 'test-tenant-id',
  title: 'Test Item',
  description: 'Test description',
  status: 'pending',
  priority: 0,
  createdAt: new Date('2026-02-18'),
  updatedAt: new Date('2026-02-18'),
  ...overrides,
})

const createTestAuth = (overrides = {}) => ({
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
  user: { id: 'test-user-id', email: 'test@example.com' },
  session: { id: 'test-session-id' },
  ...overrides,
})
```

**Location:**
- `src/__tests__/fixtures/` - Shared test data
- `src/lib/db/__tests__/fixtures.ts` - Database-specific factories
- `src/app/__tests__/mocks.ts` - Component/API route mocks

## Coverage

**Requirements:**
- Not enforced in template (can be configured)
- Recommended: Aim for 80%+ coverage on critical paths
- Critical areas: API routes, database queries with RLS, authentication

**View Coverage:**
```bash
# With Vitest
pnpm test --coverage

# Output format can be:
# - v8: Visual Studio Code compatible
# - istanbul: Traditional coverage reports
# - json: Machine-readable format
```

**Coverage Configuration Example:**
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
})
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities
- Approach: Test pure functions with various inputs
- Example: Test schema validation, utility functions
- Location: `src/lib/__tests__/`

**Integration Tests:**
- Scope: API routes with mocked dependencies
- Approach: Test request/response flow, authentication, authorization
- Example: Test GET/POST to `/api/example` with mocked database
- Location: `src/app/api/__tests__/`

**E2E Tests:**
- Not configured in template
- Framework: Playwright or Cypress
- Scope: Full application flow with real database
- Example: User creates item → item appears in list → user deletes item

## Common Patterns

**Async Testing:**
```typescript
import { describe, it, expect } from 'vitest'

describe('async functions', () => {
  it('should handle async operations', async () => {
    const result = await someAsyncFunction()
    expect(result).toBeDefined()
  })

  it('should use mock timers for delays', async () => {
    vi.useFakeTimers()
    const promise = delayedFunction()
    vi.advanceTimersByTime(1000)
    await promise
    expect(someValue).toBe(expectedValue)
    vi.restoreAllMocks()
  })
})
```

**Error Testing:**
```typescript
describe('error handling', () => {
  it('should throw 401 for unauthenticated requests', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorized'))

    expect(async () => {
      await apiRoute()
    }).rejects.toThrow('Unauthorized')
  })

  it('should return 400 for missing required fields', async () => {
    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('required')
  })
})
```

**Testing Database Isolation:**
```typescript
describe('tenant isolation', () => {
  it('should only return items for current tenant', async () => {
    // Mock withTenant to verify it was called with correct tenantId
    const withTenantSpy = vi.spyOn(mockDbModule, 'withTenant')

    await getItems(mockAuth)

    expect(withTenantSpy).toHaveBeenCalledWith(
      expect.anything(),
      'test-tenant-id',
      expect.any(Function)
    )
  })
})
```

**Testing Server Components:**
```typescript
describe('DashboardPage', () => {
  it('should render dashboard with auth context', async () => {
    vi.mocked(getAuthContext).mockResolvedValueOnce(mockAuth)
    vi.mocked(withTenant).mockResolvedValueOnce(mockItems)

    const { container } = render(await DashboardPage())

    expect(container).toHaveTextContent('Dashboard')
    expect(container).toHaveTextContent(mockAuth.tenantId)
  })

  it('should show login prompt when not authenticated', async () => {
    vi.mocked(getAuthContext).mockResolvedValueOnce(null)

    const { container } = render(await DashboardPage())

    expect(container).toHaveTextContent('Please log in')
  })
})
```

## Testing Strategy for Critical Paths

**Authentication Tests:**
- Verify `requireAuth()` throws on unauthenticated requests
- Verify `getAuthContext()` returns null when not authenticated
- Verify auth context is passed to child components

**Tenant Isolation Tests (CRITICAL):**
- Verify `withTenant()` filters by `tenantId`
- Verify `tenantId` is included in all INSERT operations
- Verify queries cannot access other tenant's data
- Test both successful queries and access denial

**API Route Tests:**
- Mock authentication and database
- Test GET/POST/PUT/DELETE operations separately
- Verify error responses (400, 401, 500)
- Verify response status codes and JSON structure

**Component Tests:**
- Mock `getAuthContext()` and `withTenant()`
- Verify conditional rendering based on auth state
- Verify data is displayed correctly
- Test loading states and error handling

## Not Yet Configured

The template does not currently include:
- Test framework (Jest/Vitest)
- Testing library utilities (@testing-library/react)
- Test configuration files (jest.config.ts, vitest.config.ts)
- Any test files in the src/ directory

To add testing:
1. Install test dependencies: `pnpm add -D vitest @testing-library/react @vitest/ui`
2. Create `vitest.config.ts` in project root
3. Add test script to `package.json`: `"test": "vitest"`
4. Create first test file following patterns above
5. Run with `pnpm test`

---

*Testing analysis: 2026-02-18*
