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
 * ¿Están los pagos activados?
 *
 * Exige DOS cosas: que la bandera `payments_enabled` de system_config esté
 * activa Y que haya clave de Stripe. El MVP sale con la bandera en false, así
 * que «sin pagos» es una decisión de producto y no el efecto colateral de que
 * falte una clave — y un despliegue que por descuido tuviera clave no empieza
 * a cobrar sin que nadie lo haya decidido.
 *
 * Todas las rutas que tocan Stripe pasan por aquí.
 */
export async function arePaymentsEnabled(): Promise<boolean> {
  const config = await getSystemConfig()
  const flag = String(config.payments_enabled ?? 'false').toLowerCase()
  if (flag !== 'true' && flag !== '1') return false
  return isStripeConfigured()
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
