export async function assignDriver(bookingInput: any) {
  const db = useDb()

  const { data: result, error } = await (db.rpc as any)('get_driver_for_assignment', {
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
    p_dest_lat: bookingInput.destinationLat ?? null,
    p_dest_lng: bookingInput.destinationLng ?? null,
    p_origin_lat: bookingInput.originLat ?? null,
    p_origin_lng: bookingInput.originLng ?? null,
  })

  if (error || !result || (result as any[]).length === 0) {
    throw new Error('No drivers available')
  }

  return result[0]
}
