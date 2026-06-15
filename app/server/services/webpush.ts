import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
  type VapidKeys,
} from '@block65/webcrypto-web-push'

export async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; data?: any },
) {
  const config = useRuntimeConfig()

  if (!config.vapidPrivateKey || !config.public.vapidPublicKey) {
    console.log('[Push] No VAPID key configured, skipping push notification')
    return
  }

  const vapid: VapidKeys = {
    subject: `mailto:${process.env.VAPID_MAILTO || 'admin@clubtaxisasturias.es'}`,
    publicKey: config.public.vapidPublicKey,
    privateKey: config.vapidPrivateKey,
  }

  const sub: PushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: null,
    keys: subscription.keys,
  }

  const message: PushMessage = {
    data: JSON.stringify(payload),
    options: { ttl: 60 },
  }

  try {
    const pushPayload = await buildPushPayload(message, sub, vapid)
    // buildPushPayload returns a fetch-ready init; cast because the DOM lib's
    // BodyInit type doesn't include Uint8Array in this TS version (runtime is fine).
    const res = await fetch(subscription.endpoint, pushPayload as RequestInit)
    if (!res.ok) {
      console.error(`[Push] Endpoint responded ${res.status} for ${subscription.endpoint}`)
    }
  } catch (e) {
    console.error('[Push] Error sending notification:', e)
  }
}

export async function notifyDriverPush(driverId: string, booking: any) {
  const db = useDb()
  const { data: subs } = await (db.rpc as any)('get_driver_push_sub', {
    p_driver_id: driverId,
  })

  if (!subs || (subs as any[]).length === 0 || !(subs[0] as any).push_subscription) return

  const appUrl = useRuntimeConfig().public.appUrl || 'https://clubtaxisasturias.es'

  await sendWebPush(
    (subs[0] as any).push_subscription,
    {
      title: 'Nueva reserva asignada',
      body: `${booking.origin_station_name || 'Parada'} → ${booking.destination_address || 'Destino'}`,
      data: {
        bookingId: booking.id,
        url: `${appUrl}/taxista/reservas/${booking.id}`,
      },
    },
  )
}
