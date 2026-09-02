import { INTEGRATION_KEYS, loadIntegrationCache, getIntegrationSync, getIntegrationSourceSync } from '../../../utils/integrations'

/** Claves sensibles: nunca se devuelven completas, solo enmascaradas. */
const SECRET_KEYS = new Set([
  'stripe_secret_key',
  'stripe_webhook_secret',
  'resend_api_key',
  'twilio_auth_token',
])

function mask(value: string): string {
  if (!value) return ''
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 7)}…${value.slice(-4)}`
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')

  // Una sola carga y luego los accesores síncronos. El bucle hacía dos `await`
  // por clave, dieciséis en total, y todos menos el primero devolvían el caché
  // sin consultar nada: eran esperas que no esperaban a nada y hacían pensar
  // que había dieciséis viajes a la base de datos.
  await loadIntegrationCache()

  const result: Record<string, { value: string, source: 'panel' | 'env' | 'none', isSecret: boolean }> = {}
  for (const key of INTEGRATION_KEYS) {
    const value = getIntegrationSync(key)
    const isSecret = SECRET_KEYS.has(key)
    result[key] = {
      value: isSecret ? mask(value) : value,
      source: getIntegrationSourceSync(key),
      isSecret,
    }
  }

  return result
})
