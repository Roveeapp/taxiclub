export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readValidated(event, editarVehiculoSchema)
  const db = useDb()

  const updateData: Record<string, any> = {}
  if (body.plate !== undefined) updateData.plate = body.plate
  if (body.brand !== undefined) updateData.brand = body.brand
  if (body.model !== undefined) updateData.model = body.model
  if (body.year !== undefined) updateData.year = body.year
  if (body.color !== undefined) updateData.color = body.color
  if (body.maxPassengers !== undefined) updateData.max_passengers = body.maxPassengers
  if (body.maxLuggageBig !== undefined) updateData.max_luggage_big = body.maxLuggageBig
  if (body.maxLuggageHand !== undefined) updateData.max_luggage_hand = body.maxLuggageHand
  if (body.hasChildSeat !== undefined) updateData.has_child_seat = body.hasChildSeat
  if (body.hasPetFriendly !== undefined) updateData.has_pet_friendly = body.hasPetFriendly
  if (body.isAccessible !== undefined) updateData.is_accessible = body.isAccessible
  if (body.isLargeVehicle !== undefined) updateData.is_large_vehicle = body.isLargeVehicle

  const { error: updateError } = await (db
    .from('vehicles') as any)
    .update(updateData)
    .eq('id', id)
    .eq('driver_id', user.id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  if (body.accessoryIds !== undefined) {
    const { error: deleteError } = await db
      .from('vehicle_accessories')
      .delete()
      .eq('vehicle_id', id)

    if (deleteError) {
      throw createError({ statusCode: 500, message: deleteError.message })
    }

    if (Array.isArray(body.accessoryIds) && body.accessoryIds.length > 0) {
      const inserts = body.accessoryIds.map((aid: string) => ({
        vehicle_id: id,
        accessory_id: aid,
      }))
      const { error: insertError } = await db
        .from('vehicle_accessories')
        .insert(inserts)

      if (insertError) {
        throw createError({ statusCode: 500, message: insertError.message })
      }
    }
  }

  return { success: true }
})
