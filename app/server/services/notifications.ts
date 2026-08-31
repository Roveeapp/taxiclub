import { Resend } from 'resend'
import { notifyDriverPush } from './webpush'
import { signBookingToken } from '../utils/bookingToken'
import { getIntegration } from '../utils/integrations'

let resend: Resend | null = null
let resendKey = ''

async function useResend() {
  const key = await getIntegration('resend_api_key')
  if (!resend || resendKey !== key) {
    resend = new Resend(key)
    resendKey = key
  }
  return resend
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  switch (template) {
    case 'new-booking':
      return `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#0c0c13;padding:24px;border-radius:14px 14px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Nueva reserva asignada</h1>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #ebebf0;border-radius:0 0 14px 14px">
            <p style="color:#0c0c13;font-size:14px;margin:0 0 16px">
              Se te ha asignado una nueva reserva:
            </p>
            <div style="background:#f4f4f8;border-radius:12px;padding:16px;margin-bottom:16px">
              <p style="margin:0 0 8px;font-size:13px;color:#999">ORIGEN</p>
              <p style="margin:0 0 12px;font-size:14px;color:#0c0c13;font-weight:500">${data.originStation || ''}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#999">DESTINO</p>
              <p style="margin:0 0 12px;font-size:14px;color:#0c0c13;font-weight:500">${data.destination || ''}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#999">FECHA</p>
              <p style="margin:0;font-size:14px;color:#0c0c13;font-weight:500">${data.pickupDate || ''}</p>
            </div>
            <a href="${data.bookingUrl || '#'}" style="display:block;background:#0c0c13;color:#fff;text-align:center;padding:14px;border-radius:14px;text-decoration:none;font-size:15px;font-weight:500">
              Ver reserva
            </a>
          </div>
        </div>`

    case 'booking-confirmed':
      return `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#1a9e6a;padding:24px;border-radius:14px 14px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Reserva confirmada</h1>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #ebebf0;border-radius:0 0 14px 14px">
            <p style="color:#0c0c13;font-size:14px;margin:0 0 16px">
              Tu reserva ha sido confirmada. Datos del vehículo:
            </p>
            <div style="background:#f4f4f8;border-radius:12px;padding:16px;margin-bottom:16px">
              <p style="margin:0 0 8px;font-size:13px;color:#999">MATRÍCULA</p>
              <p style="margin:0 0 12px;font-size:18px;color:#0c0c13;font-weight:600;letter-spacing:1px">${data.plate || ''}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#999">TELÉFONO</p>
              <p style="margin:0;font-size:14px;color:#0c0c13;font-weight:500">${data.phone || ''}</p>
            </div>
            <a href="${data.bookingUrl || '#'}" style="display:block;background:#0c0c13;color:#fff;text-align:center;padding:14px;border-radius:14px;text-decoration:none;font-size:15px;font-weight:500">
              Ver reserva
            </a>
          </div>
        </div>`

    case 'booking-created':
      return `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#0c0c13;padding:24px;border-radius:14px 14px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Reserva recibida <span style="color:#fabd32">✓</span></h1>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #ebebf0;border-radius:0 0 14px 14px">
            <p style="color:#0c0c13;font-size:14px;margin:0 0 16px">
              Hemos recibido tu reserva. Un taxista la confirmará en breve y te enviaremos la matrícula del vehículo.
            </p>
            <div style="background:#f4f4f8;border-radius:12px;padding:16px;margin-bottom:16px">
              <p style="margin:0 0 4px;font-size:13px;color:#999">RUTA</p>
              <p style="margin:0 0 12px;font-size:14px;color:#0c0c13;font-weight:500">${data.originStation || ''} → ${data.destination || ''}</p>
              <p style="margin:0 0 4px;font-size:13px;color:#999">RECOGIDA</p>
              <p style="margin:0 0 12px;font-size:14px;color:#0c0c13;font-weight:500">${data.pickupDate || ''}</p>
              <p style="margin:0 0 4px;font-size:13px;color:#999">TOTAL</p>
              <p style="margin:0;font-size:16px;color:#0c0c13;font-weight:600">${data.totalPrice || ''} €</p>
            </div>
            <a href="${data.bookingUrl || '#'}" style="display:block;background:#0c0c13;color:#fff;text-align:center;padding:14px;border-radius:14px;text-decoration:none;font-size:15px;font-weight:500">
              Ver mi reserva
            </a>
            <p style="color:#999;font-size:12px;margin:16px 0 0">
              Guarda este email: el enlace te permite consultar y gestionar tu reserva en cualquier momento.
            </p>
          </div>
        </div>`

    case 'booking-cancelled':
      return `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#d93025;padding:24px;border-radius:14px 14px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">Reserva cancelada</h1>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #ebebf0;border-radius:0 0 14px 14px">
            <p style="color:#0c0c13;font-size:14px;margin:0 0 8px">
              Tu reserva ha sido cancelada.
            </p>
            <p style="color:#999;font-size:13px;margin:0 0 16px">
              Motivo: ${data.reason || 'No especificado'}
            </p>
            <p style="color:#999;font-size:13px;margin:0">
              El pago será liberado en unos días.
            </p>
          </div>
        </div>`

    default:
      return `<p>${JSON.stringify(data)}</p>`
  }
}

export async function sendEmail(to: string, subject: string, template: string, data: Record<string, unknown>) {
  const r = await useResend()
  const html = renderTemplate(template, data)
  const from = (await getIntegration('email_from')) || 'noreply@clubtaxisasturias.es'

  await r.emails.send({ from, to, subject, html })
}

export async function sendSMS(to: string, message: string) {
  const sid = await getIntegration('twilio_account_sid')
  const token = await getIntegration('twilio_auth_token')
  const from = await getIntegration('twilio_phone_number')

  if (!sid || !token) {
    console.log(`[SMS] To: ${to} — ${message}`)
    return
  }

  const twilio = await import('twilio')
  const client = twilio.default(sid, token)

  await client.messages.create({ body: message, from, to })
}

export async function notifyDriver(driverId: string, booking: ReservaNotificable) {
  const { data: driver } = await callRpc<Array<Record<string, unknown>>>('notify_driver_data', {
    p_driver_id: driverId,
  })

  const d = driver?.[0] as { email?: string | null, phone?: string | null, full_name?: string | null, push_subscription?: unknown, [k: string]: unknown } | undefined
  if (!d?.email) return

  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'https://clubtaxisasturias.es'

  await sendEmail(d.email, `Nueva reserva: ${booking.pickup_at ? new Date(booking.pickup_at).toLocaleDateString('es-ES') : ''}`, 'new-booking', {
    originStation: booking.origin_station_name || 'Parada',
    destination: booking.destination_address || '',
    pickupDate: booking.pickup_at ? new Date(booking.pickup_at).toLocaleString('es-ES') : '',
    bookingUrl: `${appUrl}/taxista/reservas/${booking.id}`,
  })

  if (d.phone) {
    await sendSMS(d.phone, `Nueva reserva Club Taxis: ${booking.origin_station_name || ''} → ${booking.destination_address || ''}. Confirma en ${appUrl}/taxista/reservas/${booking.id}`)
  }

  // Push notification (best-effort: nunca debe romper el flujo de asignación)
  await notifyDriverPush(driverId, booking).catch((e) => {
    console.error('[Push] notifyDriver push failed:', e)
  })
}

/**
 * Email de "reserva recibida" al cliente (registrado o invitado).
 * Para invitados el enlace incluye un token firmado que les permite
 * consultar y cancelar la reserva sin cuenta.
 */
export async function notifyBookingCreated(booking: ReservaNotificable) {
  const db = useDb()
  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'https://clubtaxisasturias.es'

  let email: string | null = booking.guest_email || null
  if (!email && booking.client_id) {
    const { data: u } = await db.from('users').select('email').eq('id', booking.client_id).single()
    email = (u as { email?: string | null } | null)?.email || null
  }
  if (!email) return

  let stationName = booking.origin_address || ''
  if (booking.origin_station_id) {
    const { data: s } = await db.from('stations').select('name').eq('id', booking.origin_station_id).single()
    stationName = (s as { name?: string } | null)?.name || stationName
  }

  const isGuest = !booking.client_id
  const token = isGuest ? `?token=${signBookingToken(booking.id)}` : ''

  await sendEmail(email, 'Hemos recibido tu reserva — Club Taxis Asturias', 'booking-created', {
    originStation: stationName,
    destination: booking.destination_address || '',
    pickupDate: booking.pickup_at ? new Date(booking.pickup_at).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' }) : '',
    totalPrice: Number(booking.total_price || 0).toFixed(2),
    bookingUrl: `${appUrl}/reserva/${booking.id}${token}`,
  })
}

export async function notifyClientConfirmed(bookingId: string) {
  const { data } = await callRpc<Array<Record<string, unknown>>>('notify_client_confirmed_data', {
    p_booking_id: bookingId,
  })

  if (!data || (data as Array<Record<string, unknown>>).length === 0) return
  const row = data?.[0] as { email?: string | null, confirmed_plate?: string | null, confirmed_phone?: string | null, [k: string]: unknown } | undefined
  if (!row?.email) return

  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'https://clubtaxisasturias.es'

  await sendEmail(row.email, 'Tu reserva ha sido confirmada', 'booking-confirmed', {
    plate: row.confirmed_plate,
    phone: row.confirmed_phone,
    bookingUrl: `${appUrl}/reserva/${bookingId}`,
  })
}

export async function notifyClientCancelled(bookingId: string, reason: string) {
  const { data } = await callRpc<Array<Record<string, unknown>>>('notify_client_cancelled_data', {
    p_booking_id: bookingId,
  })

  if (!data || (data as Array<Record<string, unknown>>).length === 0) return
  const row = data?.[0] as { email?: string | null, confirmed_plate?: string | null, confirmed_phone?: string | null, [k: string]: unknown } | undefined
  if (!row?.email) return

  await sendEmail(row.email, 'Reserva cancelada', 'booking-cancelled', { reason })
}

export async function notifyAdminNoDrivers(bookingId: string) {
  console.log(`[ADMIN ALERT] No drivers available for booking ${bookingId}`)
}
