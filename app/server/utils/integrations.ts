/**
 * Configuración de integraciones (Stripe, Resend, Twilio).
 * Prioridad: tabla integration_settings (editable desde el admin)
 * → variables de entorno (.env) como fallback.
 * Se cachea en memoria y se refresca al guardar desde el panel.
 */

export type IntegrationKey =
  | 'stripe_secret_key'
  | 'stripe_publishable_key'
  | 'stripe_webhook_secret'
  | 'resend_api_key'
  | 'email_from'
  | 'twilio_account_sid'
  | 'twilio_auth_token'
  | 'twilio_phone_number'

export const INTEGRATION_KEYS: IntegrationKey[] = [
  'stripe_secret_key',
  'stripe_publishable_key',
  'stripe_webhook_secret',
  'resend_api_key',
  'email_from',
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_phone_number',
]

let cache: Record<string, string> | null = null
let loadedAt = 0
const TTL_MS = 5 * 60 * 1000

export async function loadIntegrationCache(force = false): Promise<void> {
  if (!force && cache && Date.now() - loadedAt < TTL_MS) return
  try {
    const db = useDb()
    const { data } = await db.from('integration_settings').select('key, value')
    const next: Record<string, string> = {}
    for (const row of (data || []) as Array<{ key: string, value: string }>) {
      if (row.value) next[row.key] = row.value
    }
    cache = next
    loadedAt = Date.now()
  } catch (e) {
    // Tabla aún sin crear (migración 025): seguimos con env
    if (!cache) cache = {}
    loadedAt = Date.now()
    console.error('[Integrations] No se pudo cargar integration_settings:', (e as Error)?.message)
  }
}

function envFallback(key: IntegrationKey): string {
  const config = useRuntimeConfig()
  switch (key) {
    case 'stripe_secret_key': return (config.stripeSecretKey as string) || ''
    case 'stripe_publishable_key': return (config.public.stripePublishableKey as string) || ''
    case 'stripe_webhook_secret': return (config.stripeWebhookSecret as string) || ''
    case 'resend_api_key': return (config.resendApiKey as string) || ''
    case 'email_from': return (config.emailFrom as string) || process.env.EMAIL_FROM || ''
    case 'twilio_account_sid': return (config.twilioAccountSid as string) || ''
    case 'twilio_auth_token': return (config.twilioAuthToken as string) || ''
    case 'twilio_phone_number': return (config.twilioPhoneNumber as string) || ''
    default: return ''
  }
}

/** Valor efectivo de una clave (BD > env). Carga el caché si hace falta. */
export async function getIntegration(key: IntegrationKey): Promise<string> {
  await loadIntegrationCache()
  return cache?.[key] || envFallback(key)
}

/** Versión síncrona (usa el caché ya cargado; env si no hay caché). */
export function getIntegrationSync(key: IntegrationKey): string {
  return cache?.[key] || envFallback(key)
}

/** Origen del valor efectivo, para mostrarlo en el panel. */
export async function getIntegrationSource(key: IntegrationKey): Promise<'panel' | 'env' | 'none'> {
  await loadIntegrationCache()
  if (cache?.[key]) return 'panel'
  if (envFallback(key)) return 'env'
  return 'none'
}

export function invalidateIntegrationCache(): void {
  loadedAt = 0
}
