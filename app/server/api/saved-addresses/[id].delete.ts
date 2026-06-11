export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const sql = useSql()

  await sql`
    DELETE FROM saved_addresses WHERE id = ${id} AND user_id = ${user.id}
  `
  return { success: true }
})
