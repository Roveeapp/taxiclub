export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const sql = useSql()

  await sql`
    UPDATE saved_addresses SET
      label = COALESCE(${body.label}, label),
      is_favorite = COALESCE(${body.is_favorite}, is_favorite)
    WHERE id = ${id} AND user_id = ${user.id}
  `

  return { success: true }
})
