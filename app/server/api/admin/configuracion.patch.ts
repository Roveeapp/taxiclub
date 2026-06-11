export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readBody(event)
  const db = useDb()

  const upserts = Object.entries(body).map(([key, value]) => ({
    key,
    value: JSON.stringify(value),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await db.from('system_config').upsert(upserts, {
    onConflict: 'key',
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
