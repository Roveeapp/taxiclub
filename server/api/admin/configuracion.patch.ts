export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readBody(event)
  const db = useDb()

  for (const [key, value] of Object.entries(body)) {
    await db.execute`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
    `
  }

  return { success: true }
})
