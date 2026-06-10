import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../drizzle/schema'

let client: ReturnType<typeof postgres> | null = null
let db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  if (!db) {
    const config = useRuntimeConfig()
    const connectionString = process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.replace('.supabase.co', '')}.supabase.co`
      : ''

    client = postgres(connectionString, {
      prepare: false,
      max: 1,
    })
    db = drizzle(client, { schema })
  }
  return db
}
