import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { tenantRlsPolicy } from '@madebykav/db'

/**
 * Example table demonstrating the tenant isolation pattern.
 *
 * Key patterns:
 * 1. All app tables include tenant_id column for RLS
 * 2. Use tenantRlsPolicy() helper to apply RLS in migrations
 * 3. Prefix table names with your app slug (e.g., example_items)
 * 4. Always query through withTenant() for automatic filtering
 *
 * To apply RLS policy after pushing schema:
 * ```sql
 * SELECT create_tenant_policy('example_items');
 * ```
 */
export const exampleItems = pgTable('example_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Export types for use in application code
export type ExampleItem = typeof exampleItems.$inferSelect
export type NewExampleItem = typeof exampleItems.$inferInsert

/**
 * Apply RLS policy to your tables after db:push:
 *
 * ```ts
 * import { tenantRlsPolicy } from '@madebykav/db'
 *
 * // In a migration or setup script:
 * await db.execute(tenantRlsPolicy('example_items'))
 * ```
 */
