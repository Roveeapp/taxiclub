export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const sql = useSql()

  const [vehicle] = await sql`
    INSERT INTO vehicles (
      driver_id, plate, brand, model, year, color,
      max_passengers, max_luggage_big, max_luggage_hand,
      has_child_seat, has_pet_friendly, is_accessible, is_large_vehicle
    ) VALUES (
      ${user.id}, ${body.plate}, ${body.brand}, ${body.model}, ${body.year || null}, ${body.color || null},
      ${body.maxPassengers || 4}, ${body.maxLuggageBig || 2}, ${body.maxLuggageHand || 4},
      ${body.hasChildSeat || false}, ${body.hasPetFriendly || false},
      ${body.isAccessible || false}, ${body.isLargeVehicle || false}
    )
    RETURNING *
  `

  if (body.accessoryIds && Array.isArray(body.accessoryIds) && body.accessoryIds.length > 0) {
    for (const aid of body.accessoryIds) {
      await sql`
        INSERT INTO vehicle_accessories (vehicle_id, accessory_id)
        VALUES (${vehicle.id}, ${aid})
        ON CONFLICT DO NOTHING
      `
    }
  }

  return vehicle
})
