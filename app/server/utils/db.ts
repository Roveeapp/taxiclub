import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function useDb() {
  if (!adminClient) {
    const config = useRuntimeConfig()
    const url = config.public.supabaseUrl
    const key = config.supabaseServiceRoleKey
    if (!url || !key) {
      throw new Error('Supabase URL or service role key is not configured')
    }
    adminClient = createClient(url, key, {
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
export function useSql(): ReturnType<typeof createClient> {
  return useDb()
}
