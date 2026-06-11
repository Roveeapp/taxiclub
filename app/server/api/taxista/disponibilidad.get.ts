export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: availability } = await db
    .from('driver_availability')
    .select('*')
    .eq('driver_id', user.id)
    .order('date')

  return availability || []
})
