export async function assignDriver(bookingInput: any) {
  const sql = useSql()

  const stationIds = [bookingInput.originStationId]
  if (bookingInput.destinationStationId) {
    stationIds.push(bookingInput.destinationStationId)
  }

  const result = await sql`
    SELECT DISTINCT ON (d.id)
      d.id,
      d.last_assigned_at,
      v.id AS vehicle_id,
      v.plate
    FROM drivers d
    JOIN driver_stations ds ON d.id = ds.driver_id
    JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
    WHERE
      ds.station_id = ANY(${stationIds}::uuid[])
      AND ds.is_active = TRUE
      AND d.is_active = TRUE
      AND v.max_passengers >= ${bookingInput.passengers}
      AND v.max_luggage_big >= ${bookingInput.luggageBig}
      AND v.max_luggage_hand >= ${bookingInput.luggageHand}
      AND (${bookingInput.needsChildSeat} = FALSE OR v.has_child_seat = TRUE)
      AND (${bookingInput.needsPetFriendly} = FALSE OR v.has_pet_friendly = TRUE)
      AND (${bookingInput.needsAccessible} = FALSE OR v.is_accessible = TRUE)
      AND (${bookingInput.needsLargeVehicle} = FALSE OR v.is_large_vehicle = TRUE)
      AND NOT EXISTS (
        SELECT 1 FROM booking_assignments ba
        JOIN bookings b ON b.id = ba.booking_id
        WHERE ba.driver_id = d.id
          AND b.status IN ('pending','confirmed')
          AND b.pickup_at BETWEEN (${bookingInput.pickupAt}::timestamptz - INTERVAL '3 hours')
                              AND (${bookingInput.pickupAt}::timestamptz + INTERVAL '3 hours')
      )
      AND NOT EXISTS (
        SELECT 1 FROM driver_availability da
        WHERE da.driver_id = d.id
          AND da.date = DATE(${bookingInput.pickupAt}::timestamptz)
          AND da.is_available = FALSE
      )
    ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
    LIMIT 1
  `

  if (result.length === 0) {
    throw new Error('No drivers available')
  }

  return result[0]
}
