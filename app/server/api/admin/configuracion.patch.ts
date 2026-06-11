export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readBody(event)
  const sql = useSql()

  for (const [key, value] of Object.entries(body)) {
    await sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
    `
  }

  return { success: true }
})
