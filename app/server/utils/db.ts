import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

let adminClient: SupabaseClient<Database> | null = null

export function useDb(): SupabaseClient<Database> {
  if (adminClient) return adminClient

  // runtimeConfig funciona en todos los entornos (Node, Cloudflare Workers…):
  // los valores se hornean en build desde .env y se pueden sobreescribir en
  // producción con NUXT_SUPABASE_SERVICE_ROLE_KEY / NUXT_PUBLIC_SUPABASE_URL.
  const config = useRuntimeConfig()
  const url = (config.public?.supabaseUrl as string)
    || process.env.SUPABASE_URL
    || process.env.NUXT_PUBLIC_SUPABASE_URL
    || ''
  const key = (config.supabaseServiceRoleKey as string)
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || ''

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
