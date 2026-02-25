import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ready' })
  } catch {
    return Response.json({ status: 'not ready' }, { status: 503 })
  }
}
