export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const sql = useSql()

  const vehicles = await sql`
    SELECT * FROM vehicles WHERE id = ${id} AND driver_id = ${user.id}
  `

  if (vehicles.length === 0) {
    throw createError({ statusCode: 404, message: 'Vehicle not found' })
  }

  return vehicles[0]
})
