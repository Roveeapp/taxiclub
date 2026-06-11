export default defineEventHandler(async () => {
  const db = useDb()
  const { data: accessories } = await db
    .from('accessories')
    .select('id, name, icon, description')
    .eq('is_active', true)
    .order('name')

  return accessories || []
})
