import Stripe from 'stripe'
import { getIntegrationSync, loadIntegrationCache } from '../utils/integrations'

let stripeInstance: Stripe | null = null
let instanceKey = ''

/**
 * Cliente de Stripe con la clave efectiva (panel admin > .env).
 * Si el admin cambia la clave, la instancia se recrea sola.
 */
export function useStripe() {
  // Refresco del caché en segundo plano (no bloquea)
  loadIntegrationCache().catch(() => {})

  const key = getIntegrationSync('stripe_secret_key')
  if (!key) {
    throw new Error('Stripe no está configurado (ni en el panel ni en STRIPE_SECRET_KEY)')
  }

  if (!stripeInstance || instanceKey !== key) {
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
    })
    instanceKey = key
  }
  return stripeInstance
}

/** ¿Hay clave de Stripe configurada? (panel o env) */
export async function isStripeConfigured(): Promise<boolean> {
  await loadIntegrationCache()
  return !!getIntegrationSync('stripe_secret_key')
}
