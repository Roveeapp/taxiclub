export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  // `select('*')` a propósito: la vista de detalle del admin muestra la reserva
  // completa y el `...b` del final la devuelve entera, así que aquí la fila ES
  // la respuesta. Enumerar columnas solo añadiría una lista que hay que
  // mantener al día con la plantilla.
  const { data: booking, error } = await db
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const b = booking as { id: string, client_id: string | null, origin_station_id: string | null, destination_station_id: string | null, stripe_payment_intent_id: string | null, [k: string]: unknown }

  // Las tres consultas que solo dependen de la reserva van juntas. Estaban en
  // serie y no se necesitan entre ellas: parada de origen, cliente y
  // asignación. Con la latencia de Supabase eso son tres viajes de ida y
  // vuelta esperando uno detrás de otro para abrir una pantalla.
  const [estacion, usuario, asignacion] = await Promise.all([
    b.origin_station_id
      ? db.from('stations').select('name').eq('id', b.origin_station_id).single()
      : Promise.resolve({ data: null }),
    b.client_id
      ? db.from('users').select('full_name, email, phone').eq('id', b.client_id).single()
      : Promise.resolve({ data: null }),
    // `*` a propósito: los campos de la asignación se devuelven al panel
    db.from('booking_assignments').select('*').eq('booking_id', id).maybeSingle(),
  ])

  const originStationName = (estacion.data as { name?: string } | null)?.name || ''

  // Cliente (cuenta o invitado)
  const u = usuario.data as { full_name?: string, email?: string, phone?: string } | null
  const clientName = u?.full_name || b.guest_name || null
  const clientEmail = u?.email || b.guest_email || null
  const clientPhone = u?.phone || b.guest_phone || null

  let driver: Record<string, unknown> | null = null
  const a = asignacion.data as { driver_id: string, [k: string]: unknown } | null
  if (a?.driver_id) {
    // Estas dos sí dependen de la asignación, pero no una de la otra
    const [du, dd] = await Promise.all([
      db.from('users').select('full_name, email, phone').eq('id', a.driver_id).single(),
      db.from('drivers').select('license_number, is_member').eq('id', a.driver_id).single(),
    ])
    driver = {
      id: a.driver_id,
      name: du.data?.full_name || '',
      email: du.data?.email || '',
      phone: du.data?.phone || '',
      license_number: dd.data?.license_number || '',
      is_member: dd.data?.is_member ?? null,
    }
  }

  // Estado del pago en Stripe (si existe PI real)
  let payment: Record<string, unknown> | null = null
  const piId = b.stripe_payment_intent_id as string | undefined
  if (piId && !piId.startsWith('pi_mock_')) {
    try {
      const stripe = useStripe()
      const pi = await stripe.paymentIntents.retrieve(piId)
      payment = {
        id: pi.id,
        status: pi.status,
        amount: pi.amount / 100,
        amountCapturable: (pi.amount_capturable || 0) / 100,
        amountReceived: (pi.amount_received || 0) / 100,
        currency: pi.currency,
      }
    } catch (e) {
      console.error('[Stripe] Error consultando PI:', e)
      payment = { error: true }
    }
  }

  return {
    ...b,
    payment,
    origin_station_name: originStationName,
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    driver_id: a?.driver_id || null,
    confirmed_plate: a?.confirmed_plate || null,
    confirmed_phone: a?.confirmed_phone || null,
    confirmed_at: a?.confirmed_at || null,
    driver,
  }
})
