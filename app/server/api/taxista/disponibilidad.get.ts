export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: availability } = await db
    .from('driver_availability')
    // `*` a propósito: el calendario del taxista pinta la fila entera, así que aquí la fila ES la respuesta.
    .select('*')
    .eq('driver_id', user.id)
    .order('date')

  return availability || []
})
