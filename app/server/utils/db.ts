import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

let adminClient: SupabaseClient<Database> | null = null

export function useDb(): SupabaseClient<Database> {
  if (!adminClient) {
    const config = useRuntimeConfig()
    const url = config.public.supabaseUrl
    const key = config.supabaseServiceRoleKey
    if (!url || !key) {
      throw new Error('Supabase URL or service role key is not configured')
    }
    adminClient = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return adminClient
}

// Deprecated: kept only for compatibility during migration.
// It now returns the Supabase client, not a SQL executor.
export function useSql(): SupabaseClient<Database> {
  return useDb()
}
