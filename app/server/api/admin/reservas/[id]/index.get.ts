export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { data: booking, error } = await db
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const b = booking as Record<string, any>

  // Estación de origen
  let originStationName = ''
  if (b.origin_station_id) {
    const { data: s } = await db.from('stations').select('name').eq('id', b.origin_station_id).single()
    originStationName = (s as any)?.name || ''
  }

  // Cliente (cuenta o invitado)
  let clientName = b.guest_name || null
  let clientEmail = b.guest_email || null
  let clientPhone = b.guest_phone || null
  if (b.client_id) {
    const { data: u } = await db.from('users').select('full_name, email, phone').eq('id', b.client_id).single()
    clientName = (u as any)?.full_name || clientName
    clientEmail = (u as any)?.email || clientEmail
    clientPhone = (u as any)?.phone || clientPhone
  }

  // Asignación + datos del conductor
  const { data: assignment } = await db
    .from('booking_assignments')
    .select('*')
    .eq('booking_id', id)
    .maybeSingle()

  let driver: Record<string, any> | null = null
  const a = assignment as Record<string, any> | null
  if (a?.driver_id) {
    const { data: du } = await db.from('users').select('full_name, email, phone').eq('id', a.driver_id).single()
    const { data: dd } = await db.from('drivers').select('license_number, is_member').eq('id', a.driver_id).single()
    driver = {
      id: a.driver_id,
      name: (du as any)?.full_name || '',
      email: (du as any)?.email || '',
      phone: (du as any)?.phone || '',
      license_number: (dd as any)?.license_number || '',
      is_member: (dd as any)?.is_member ?? null,
    }
  }

  // Estado del pago en Stripe (si existe PI real)
  let payment: Record<string, any> | null = null
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
