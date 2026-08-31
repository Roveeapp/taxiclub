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

/**
 * Comprueba que un PaymentIntent enviado por el cliente es real y corresponde
 * al importe de ESTA reserva.
 *
 * Antes el identificador se guardaba tal cual en la reserva, sin verificar
 * nada: se podía adjuntar el intent de 0,50 € de otra operación a un viaje de
 * 200 €, o inventarse uno.
 *
 * Lanza un error si no cuadra. Devuelve el id verificado.
 */
export async function verifyPaymentIntentForBooking(
  paymentIntentId: string,
  expectedTotal: number,
): Promise<string> {
  const stripe = useStripe()

  let intent: Stripe.PaymentIntent
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch {
    throw createError({ statusCode: 400, message: 'El pago indicado no existe' })
  }

  if (intent.currency !== 'eur') {
    throw createError({ statusCode: 400, message: 'El pago no está en euros' })
  }

  const expectedCents = Math.round(expectedTotal * 100)
  if (intent.amount !== expectedCents) {
    // No revelamos las cifras al cliente, pero las registramos para poder
    // detectar intentos de manipulación.
    console.error(
      `[Stripe] Importe del intent ${paymentIntentId} no coincide: ` +
      `intent=${intent.amount} esperado=${expectedCents}`,
    )
    throw createError({ statusCode: 400, message: 'El importe del pago no coincide con el de la reserva' })
  }

  if (intent.status === 'canceled') {
    throw createError({ statusCode: 400, message: 'El pago está cancelado' })
  }

  // Un intent solo puede sostener una reserva. La columna tiene índice único,
  // pero comprobarlo aquí da un error claro en lugar de un choque de clave.
  const db = useDb()
  const { data: existing } = await db
    .from('bookings')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: 'Ese pago ya está asociado a otra reserva' })
  }

  return intent.id
}
