export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readValidated(event, crearAccesorioSchema)
  const db = useDb()

  const name = String(body?.name || '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const { data, error } = await (db.from('accessories') as any)
    .insert({
      name,
      icon: String(body?.icon || 'tabler:star').trim(),
      description: String(body?.description || '').trim() || null,
      slug,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    const msg = error.message?.includes('duplicate') ? 'Ya existe un accesorio con ese nombre' : error.message
    throw createError({ statusCode: 400, message: msg })
  }
  return data
})
