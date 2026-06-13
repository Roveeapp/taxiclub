import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

let adminClient: SupabaseClient<Database> | null = null

export function useDb(): SupabaseClient<Database> {
  if (adminClient) return adminClient

  const url = process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!url || !key) {
    throw new Error(`Supabase not configured — url=${!!url} key=${!!key}`)
  }

  adminClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
}

export function useSql(): SupabaseClient<Database> {
  return useDb()
}
