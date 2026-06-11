import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../drizzle/schema'

let client: ReturnType<typeof postgres> | null = null
let db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    client = postgres(connectionString, {
      prepare: false,
      max: 1,
    })
    db = drizzle(client, { schema })
  }
  return db
}
