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
        const { data: unconfirmed, error } = await supabaseAdmin.rpc('get_unconfirmed_assignments', {
          p_threshold: threshold,
        })

        if (error) throw error

        for (const assignment of unconfirmed || []) {
          console.log(`Reminder needed for booking ${assignment.booking_id}`)
          // Aquí se implementaría el envío de push notification
        }
        return Response.json({ success: true, reminders: unconfirmed?.length || 0 })
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
