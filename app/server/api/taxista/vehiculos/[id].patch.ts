export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const sql = useSql()

  await sql`
    UPDATE vehicles SET
      plate = COALESCE(${body.plate}, plate),
      brand = COALESCE(${body.brand}, brand),
      model = COALESCE(${body.model}, model),
      year = COALESCE(${body.year}, year),
      color = COALESCE(${body.color}, color),
      max_passengers = COALESCE(${body.maxPassengers}, max_passengers),
      max_luggage_big = COALESCE(${body.maxLuggageBig}, max_luggage_big),
      max_luggage_hand = COALESCE(${body.maxLuggageHand}, max_luggage_hand),
      has_child_seat = COALESCE(${body.hasChildSeat}, has_child_seat),
      has_pet_friendly = COALESCE(${body.hasPetFriendly}, has_pet_friendly),
      is_accessible = COALESCE(${body.isAccessible}, is_accessible),
      is_large_vehicle = COALESCE(${body.isLargeVehicle}, is_large_vehicle)
    WHERE id = ${id} AND driver_id = ${user.id}
  `

  return { success: true }
})
