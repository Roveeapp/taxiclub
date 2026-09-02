export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data, error } = await db
    .from('accessories')
    // `*` a propósito: el panel edita todos los campos del accesorio, así que aquí la fila ES la respuesta.
    .select('*')
    .order('name')

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data || []
})
