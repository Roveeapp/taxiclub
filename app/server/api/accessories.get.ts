export default defineEventHandler(async () => {
  const sql = useSql()
  const accessories = await sql`
    SELECT id, name, icon, description
    FROM accessories
    WHERE is_active = TRUE
    ORDER BY name
  `
  return accessories
})
