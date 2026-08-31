const TIPOS_ADMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB, igual que driver-docs

/**
 * Sube el resguardo de un cobro (justificante de transferencia, recibo…).
 *
 * Va al bucket privado payout-receipts, con la ruta
 * `<driver_id>/<payout_id>/<cobro_id>.<ext>`: agrupa por conductor y por
 * liquidación, así que localizar los justificantes de un taxista o de un mes es
 * inmediato sin consultar la base de datos.
 *
 * El bucket es privado y no se sirve por URL pública: la descarga pasa por
 * resguardo.get.ts, que firma una URL temporal. Un justificante bancario lleva
 * datos de cuenta, y una URL pública sería permanente y adivinable.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const payoutId = getRouterParam(event, 'id')
  const cobroId = getRouterParam(event, 'cobroId')
  if (!payoutId || !cobroId) {
    throw createError({ statusCode: 400, message: 'Faltan identificadores' })
  }

  const db = useDb()

  const { data: cobro, error: findError } = await db
    .from('payout_settlements')
    .select('id, payout_id, receipt_path, driver_payouts!inner(driver_id)')
    .eq('id', cobroId)
    .eq('payout_id', payoutId)
    .single()

  if (findError || !cobro) {
    throw createError({ statusCode: 404, message: 'Cobro no encontrado' })
  }

  const c = cobro as unknown as { receipt_path: string | null, driver_payouts: { driver_id: string } }
  const driverId = c.driver_payouts.driver_id

  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.data?.length)
  if (!file?.data) {
    throw createError({ statusCode: 400, message: 'No se ha recibido ningún fichero' })
  }

  const ext = TIPOS_ADMITIDOS[file.type || '']
  if (!ext) {
    throw createError({ statusCode: 400, message: 'Formato no admitido: usa JPG, PNG o PDF' })
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: 'El fichero supera el máximo de 5 MB' })
  }

  const path = `${driverId}/${payoutId}/${cobroId}.${ext}`

  const { error: uploadError } = await db.storage
    .from('payout-receipts')
    .upload(path, file.data, { contentType: file.type, upsert: true })

  if (uploadError) {
    throw createError({ statusCode: 500, message: `No se pudo guardar el resguardo: ${uploadError.message}` })
  }

  // Si se reemplaza por otro formato, se borra el anterior para no dejar
  // ficheros huérfanos en el bucket
  if (c.receipt_path && c.receipt_path !== path) {
    await db.storage.from('payout-receipts').remove([c.receipt_path])
  }

  const { error: updateError } = await writeTable('payout_settlements')
    .update({ receipt_path: path })
    .eq('id', cobroId)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  return { success: true, tiene_resguardo: true }
})
