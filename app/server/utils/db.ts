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

/**
 * Llama a una función RPC de Postgres con un tipo de retorno declarado.
 *
 * El cliente tipado de Supabase no conoce las funciones propias del proyecto,
 * y el atajo habitual en este código es `callRpc<Array<Record<string, unknown>>>(...)`, que aparece 124
 * veces en el servidor y anula el esquema de types/database.ts. Este ayudante
 * concentra el único cast necesario en un sitio y deja que quien llama declare
 * la forma que espera.
 */
export async function callRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ data: T | null, error: { message: string } | null }> {
  // Se invoca como método sobre el cliente, no desprendiendo db.rpc a una
  // variable: `rpc` necesita su `this`, y separarlo rompe con
  // "Cannot read properties of undefined (reading 'rest')".
  const db = useDb() as unknown as {
    rpc: (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: T | null, error: { message: string } | null }>
  }
  return db.rpc(name, args)
}

type QueryResult<T> = Promise<{ data: T | null, error: { message: string } | null }>

interface SelectChain {
  single: <T = unknown>() => QueryResult<T>
  maybeSingle: <T = unknown>() => QueryResult<T>
}

/**
 * Filtros encadenables. Se declaran los que el servidor usa de verdad; añadir
 * uno nuevo aquí es preferible a volver a un cast.
 */
interface Filtrable extends QueryResult<null> {
  eq: (column: string, value: unknown) => Filtrable & { select: (columns?: string) => SelectChain & QueryResult<unknown[]> }
  neq: (column: string, value: unknown) => Filtrable
  in: (column: string, values: unknown[]) => Filtrable
  is: (column: string, value: unknown) => Filtrable
  lt: (column: string, value: unknown) => Filtrable
  lte: (column: string, value: unknown) => Filtrable
  gt: (column: string, value: unknown) => Filtrable
  gte: (column: string, value: unknown) => Filtrable
}

/**
 * Acceso de escritura a una tabla con una forma mínima declarada.
 *
 * Mismo motivo que callRpc: el patrón `writeTable('x')` estaba repetido
 * por todo el servidor y desactivaba el esquema tipado de types/database.ts.
 * Aquí el cast vive en un solo sitio y quien llama declara el tipo de fila que
 * espera.
 *
 * Es un paso intermedio: ahora que los tipos se generan del esquema real, lo
 * ideal es usar el cliente tipado directamente. Este ayudante cubre mientras
 * tanto los sitios donde el tipo generado y el uso no encajan.
 */
export function writeTable(name: string) {
  const db = useDb()
  return db.from(name as never) as unknown as {
    insert: (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
      select: (columns?: string) => SelectChain & QueryResult<unknown[]>
    } & QueryResult<null>
    upsert: (
      row: Record<string, unknown> | Array<Record<string, unknown>>,
      options?: { onConflict?: string, ignoreDuplicates?: boolean },
    ) => {
      select: (columns?: string) => SelectChain & QueryResult<unknown[]>
    } & QueryResult<null>
    update: (row: Record<string, unknown>) => Filtrable
    delete: () => Filtrable
  }
}
