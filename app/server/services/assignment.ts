export interface AssignmentCandidate {
  id: string
  [key: string]: unknown
}

export interface AssignDriverInput {
  originStationId?: string | null
  destinationStationId?: string | null
  passengers?: number
  luggageBig?: number
  luggageHand?: number
  needsChildSeat?: boolean
  needsPetFriendly?: boolean
  needsAccessible?: boolean
  needsLargeVehicle?: boolean
  pickupAt?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
  originLat?: number | null
  originLng?: number | null
}

/**
 * Elige el siguiente conductor por round-robin.
 *
 * Devuelve null cuando simplemente no hay candidatos (situación normal de
 * negocio) y lanza cuando el RPC falla. Antes ambos casos lanzaban el mismo
 * error, así que quien llamaba avisaba al admin de "no hay conductores"
 * incluso cuando el problema era un bug o la base de datos, y el error real
 * se perdía sin registrarse.
 */
export async function assignDriver(
  bookingInput: AssignDriverInput,
): Promise<AssignmentCandidate | null> {
  const { data: result, error } = await callRpc<AssignmentCandidate[]>('get_driver_for_assignment', {
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

  if (error) {
    throw new Error(`get_driver_for_assignment falló: ${error.message}`)
  }

  if (!result || result.length === 0) {
    return null
  }

  return result[0] ?? null
}
