export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  await db.execute`
    UPDATE return_offers SET status = 'cancelled'
    WHERE id = ${id} AND driver_id = ${user.id}
  `

  return { success: true }
})
