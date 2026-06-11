export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  const { data: vehicle, error: insertError } = await db
    .from('vehicles')
    .insert({
      driver_id: user.id,
      plate: body.plate,
      brand: body.brand,
      model: body.model,
      year: body.year || null,
      color: body.color || null,
      max_passengers: body.maxPassengers || 4,
      max_luggage_big: body.maxLuggageBig || 2,
      max_luggage_hand: body.maxLuggageHand || 4,
      has_child_seat: body.hasChildSeat || false,
      has_pet_friendly: body.hasPetFriendly || false,
      is_accessible: body.isAccessible || false,
      is_large_vehicle: body.isLargeVehicle || false,
    })
    .select()
    .single()

  if (insertError || !vehicle) {
    throw createError({ statusCode: 500, message: insertError?.message || 'Failed to create vehicle' })
  }

  if (body.accessoryIds && Array.isArray(body.accessoryIds) && body.accessoryIds.length > 0) {
    const inserts = body.accessoryIds.map((aid: string) => ({
      vehicle_id: vehicle.id,
      accessory_id: aid,
    }))
    const { error: vaError } = await db.from('vehicle_accessories').insert(inserts)

    if (vaError) {
      throw createError({ statusCode: 500, message: vaError.message })
    }
  }

  return vehicle
})
