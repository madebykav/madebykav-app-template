import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Re-export tenant isolation helpers from SDK
export { withTenant, withoutRLS } from '@madebykav/db'

// Create database connection
const connectionString = process.env.DATABASE_URL!

// For query execution (pooled connection)
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for connection pooling
})

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

export type Database = typeof db
