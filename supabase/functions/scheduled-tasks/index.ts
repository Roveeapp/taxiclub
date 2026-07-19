import { createClient } from 'npm:@supabase/supabase-js@^2.39.0'

Deno.serve(async (req) => {
  // Solo aceptamos POST para mayor seguridad
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Verificamos authorization via Service Role (o Custom Secret) para seguridad cron
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { task } = await req.json()

    switch (task) {
      case 'expire-offers': {
        console.log('[CRON] Executing expire-offers')
        const { data, error } = await supabaseAdmin
          .from('return_offers')
          .update({ status: 'expired' })
          .eq('status', 'active')
          .lt('available_until', new Date().toISOString())
          .select('id')

        if (error) throw error
        return Response.json({ success: true, expired: data?.length || 0 })
      }

      case 'remind-unconfirmed': {
        console.log('[CRON] Executing remind-unconfirmed')
        const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        // RPC v2 (migración 017) devuelve email y datos del viaje
        const { data: unconfirmed, error } = await supabaseAdmin.rpc('get_unconfirmed_assignments_v2', {
          p_threshold: threshold,
        })

        if (error) throw error

        const resendKey = Deno.env.get('RESEND_API_KEY')
        const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'noreply@clubtaxisasturias.es'
        const appUrl = Deno.env.get('APP_URL') ?? 'https://clubtaxisasturias.es'

        let sent = 0
        for (const a of unconfirmed || []) {
          if (!resendKey || !a.driver_email) {
            console.log(`Reminder needed for booking ${a.booking_id} (email no enviado: falta RESEND_API_KEY o email)`)
            continue
          }
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: emailFrom,
                to: a.driver_email,
                subject: '⏰ Recordatorio: reserva pendiente de confirmar',
                html: `
                  <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
                    <div style="background:#e5990a;padding:24px;border-radius:14px 14px 0 0">
                      <h1 style="color:#fff;margin:0;font-size:20px">Reserva sin confirmar</h1>
                    </div>
                    <div style="background:#fff;padding:24px;border:1px solid #ebebf0;border-radius:0 0 14px 14px">
                      <p style="color:#0c0c13;font-size:14px;margin:0 0 16px">
                        Tienes una reserva asignada esperando tu confirmación:
                      </p>
                      <div style="background:#f4f4f8;border-radius:12px;padding:16px;margin-bottom:16px">
                        <p style="margin:0 0 4px;font-size:13px;color:#999">RUTA</p>
                        <p style="margin:0 0 12px;font-size:14px;color:#0c0c13;font-weight:500">${a.origin_station_name ?? ''} → ${a.destination_address ?? ''}</p>
                        <p style="margin:0 0 4px;font-size:13px;color:#999">RECOGIDA</p>
                        <p style="margin:0;font-size:14px;color:#0c0c13;font-weight:500">${a.pickup_at ? new Date(a.pickup_at).toLocaleString('es-ES') : ''}</p>
                      </div>
                      <a href="${appUrl}/taxista/reservas/${a.booking_id}" style="display:block;background:#0c0c13;color:#fff;text-align:center;padding:14px;border-radius:14px;text-decoration:none;font-size:15px;font-weight:500">
                        Confirmar ahora
                      </a>
                    </div>
                  </div>`,
              }),
            })
            if (res.ok) sent++
            else console.error(`Resend error ${res.status}: ${await res.text()}`)
          } catch (e) {
            console.error(`Error enviando recordatorio para ${a.booking_id}:`, e)
          }
        }
        return Response.json({ success: true, reminders: unconfirmed?.length || 0, sent })
      }

      case 'charge-memberships': {
        console.log('[CRON] Executing charge-memberships')
        const { data: members, error } = await supabaseAdmin.rpc('get_active_members')
        if (error) throw error

        let charged = 0
        for (const member of members || []) {
          if (member.stripe_account_id) {
            console.log(`Charging fee to driver ${member.id}`)
            charged++
          }
        }
        return Response.json({ success: true, charged })
      }

      case 'process-payouts': {
        console.log('[CRON] Executing process-payouts')
        const { data: drivers, error } = await supabaseAdmin.rpc('get_active_drivers')
        if (error) throw error

        return Response.json({ success: true, processed: drivers?.length || 0 })
      }

      default:
        return new Response('Unknown task', { status: 400 })
    }
  } catch (err) {
    console.error(`Task Error: ${err instanceof Error ? err.message : 'Unknown Error'}`)
    return new Response(`Task Error: ${err instanceof Error ? err.message : 'Unknown Error'}`, { status: 500 })
  }
})
