export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: addresses } = await db
    .from('saved_addresses')
    .select('id, label, address, lat, lng, is_favorite')
    .eq('user_id', user.id)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false })

  return addresses || []
})
