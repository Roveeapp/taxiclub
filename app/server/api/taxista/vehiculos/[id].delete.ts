export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const sql = useSql()

  await sql`
    UPDATE vehicles SET is_active = FALSE
    WHERE id = ${id} AND driver_id = ${user.id}
  `

  return { success: true }
})
