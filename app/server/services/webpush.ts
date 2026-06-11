import webpush from 'web-push'

export async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; data?: any },
) {
  const config = useRuntimeConfig()

  if (!config.vapidPrivateKey) {
    console.log('[Push] No VAPID key configured, skipping push notification')
    return
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_MAILTO || 'admin@clubtaxisasturias.es'}`,
    config.public.vapidPublicKey,
    config.vapidPrivateKey,
  )

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
    )
  } catch (e) {
    console.error('[Push] Error sending notification:', e)
  }
}

export async function notifyDriverPush(driverId: string, booking: any) {
  const sql = useSql()
  const subs = await sql`
    SELECT push_subscription FROM users WHERE id = ${driverId}
  `

  if (subs.length === 0 || !(subs[0] as any).push_subscription) return

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
