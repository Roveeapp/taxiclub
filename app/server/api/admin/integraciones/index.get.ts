import { INTEGRATION_KEYS, getIntegration, getIntegrationSource } from '../../../utils/integrations'

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

  const result: Record<string, { value: string, source: 'panel' | 'env' | 'none', isSecret: boolean }> = {}
  for (const key of INTEGRATION_KEYS) {
    const value = await getIntegration(key)
    const source = await getIntegrationSource(key)
    const isSecret = SECRET_KEYS.has(key)
    result[key] = {
      value: isSecret ? mask(value) : value,
      source,
      isSecret,
    }
  }

  return result
})
