const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * Sube la foto de un vehículo a Supabase Storage y guarda la URL pública.
 * Multipart form-data con un campo "file".
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  // El vehículo debe ser del taxista autenticado
  const { data: vehicle, error: findError } = await db
    .from('vehicles')
    .select('id, driver_id')
    .eq('id', id)
    .eq('driver_id', user.id)
    .single()

  if (findError || !vehicle) {
    throw createError({ statusCode: 404, message: 'Vehículo no encontrado' })
  }

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.data?.length)
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'No se ha recibido ninguna imagen' })
  }

  const mime = file.type || ''
  const ext = ALLOWED_TYPES[mime]
  if (!ext) {
    throw createError({ statusCode: 400, message: 'Formato no soportado (usa JPG, PNG o WebP)' })
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'La imagen supera el máximo de 5 MB' })
  }

  const path = `${user.id}/${id}.${ext}`

  const { error: uploadError } = await db.storage
    .from('vehicle-photos')
    .upload(path, file.data, { contentType: mime, upsert: true })

  if (uploadError) {
    throw createError({ statusCode: 500, message: `Error subiendo la imagen: ${uploadError.message}` })
  }

  const { data: urlData } = db.storage.from('vehicle-photos').getPublicUrl(path)
  // Cache-buster para que el navegador refresque al reemplazar la foto
  const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await writeTable('vehicles')
    .update({ photo_url: photoUrl })
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  return { success: true, photoUrl }
})
