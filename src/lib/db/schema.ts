import { pgTable, pgPolicy, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { createTenantPolicy } from '@madebykav/db'

/**
 * Example table with declarative RLS.
 *
 * Key patterns:
 * 1. Every table has a tenant_id column (multiple tenants use the same app)
 * 2. RLS policy defined in the schema via pgPolicy() + createTenantPolicy()
 * 3. Always query through withTenant() from @madebykav/db
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
}, (table) => [
  pgPolicy('example_items_tenant_isolation', createTenantPolicy()),
])

export type ExampleItem = typeof exampleItems.$inferSelect
export type NewExampleItem = typeof exampleItems.$inferInsert
