export default defineEventHandler(async () => {
  const db = useDb()
  const { data: stations } = await db
    .from('stations')
    .select('id, name, city, address, lat, lng')
    .eq('is_active', true)
    .order('name')

  return stations || []
})
