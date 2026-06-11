import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function useSupabaseAdmin() {
  if (!adminClient) {
    const config = useRuntimeConfig()
    adminClient = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceRoleKey,
    )
  }
  return adminClient
}
