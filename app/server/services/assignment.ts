export async function assignDriver(bookingInput: any) {
  const db = useDb()

  const { data: result, error } = await db.rpc('get_driver_for_assignment', {
    p_origin_station_id: bookingInput.originStationId,
    p_destination_station_id: bookingInput.destinationStationId || null,
    p_passengers: bookingInput.passengers,
    p_luggage_big: bookingInput.luggageBig,
    p_luggage_hand: bookingInput.luggageHand,
    p_needs_child_seat: bookingInput.needsChildSeat || false,
    p_needs_pet_friendly: bookingInput.needsPetFriendly || false,
    p_needs_accessible: bookingInput.needsAccessible || false,
    p_needs_large_vehicle: bookingInput.needsLargeVehicle || false,
    p_pickup_at: bookingInput.pickupAt,
  })

  if (error || !result || result.length === 0) {
    throw new Error('No drivers available')
  }

  return result[0]
}
