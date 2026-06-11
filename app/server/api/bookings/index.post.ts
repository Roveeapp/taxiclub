export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = requireAuth(event)

  const sql = useSql()

  const [booking] = await sql`
    INSERT INTO bookings (
      client_id, origin_station_id, destination_address,
      destination_lat, destination_lng, destination_station_id,
      pickup_at, passengers, luggage_big, luggage_hand,
      needs_child_seat, needs_pet_friendly, needs_accessible, needs_large_vehicle,
      base_price, total_price, status, stripe_payment_intent_id
    ) VALUES (
      ${user.id}, ${body.originStationId}, ${body.destinationAddress},
      ${body.destinationLat || null}, ${body.destinationLng || null}, ${body.destinationStationId || null},
      ${body.pickupAt}, ${body.passengers}, ${body.luggageBig}, ${body.luggageHand},
      ${body.needsChildSeat || false}, ${body.needsPetFriendly || false},
      ${body.needsAccessible || false}, ${body.needsLargeVehicle || false},
      ${body.basePrice}, ${body.totalPrice}, 'pending', ${body.stripePaymentIntentId}
    )
    RETURNING *
  `

  try {
    const driver = await assignDriver(body)
    await sql`
      INSERT INTO booking_assignments (booking_id, driver_id)
      VALUES (${booking.id}, ${driver.id})
    `
    await sql`
      UPDATE drivers SET last_assigned_at = NOW() WHERE id = ${driver.id}
    `
    await notifyDriver(driver.id as string, booking)
  } catch {
    await notifyAdminNoDrivers(booking.id as string)
  }

  return booking
})
