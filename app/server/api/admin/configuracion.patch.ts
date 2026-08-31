export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readValidated(event, configuracionSchema)

  const upserts = Object.entries(body).map(([key, value]) => ({
    key,
    value: JSON.stringify(value),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await writeTable('system_config').upsert(upserts, {
    onConflict: 'key',
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
