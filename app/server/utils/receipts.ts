/** Minutos que vive la URL firmada de un resguardo. */
export const RESGUARDO_VALIDEZ_MINUTOS = 10

/**
 * Firma una descarga temporal del resguardo de un cobro.
 *
 * El bucket payout-receipts es privado a propósito: un justificante de
 * transferencia lleva datos de cuenta, y una URL pública sería permanente y
 * adivinable. La firma caduca en minutos, suficiente para abrirlo o guardarlo.
 *
 * `driverIdEsperado` restringe el acceso al conductor dueño de la liquidación.
 * Se omite para un administrador.
 */
export async function firmarResguardo(
  payoutId: string,
  cobroId: string,
  driverIdEsperado?: string,
): Promise<{ url: string, caducaEnMinutos: number }> {
  const db = useDb()

  const { data: cobro, error } = await db
    .from('payout_settlements')
    .select('id, receipt_path, driver_payouts!inner(driver_id)')
    .eq('id', cobroId)
    .eq('payout_id', payoutId)
    .single()

  if (error || !cobro) {
    throw createError({ statusCode: 404, message: 'Cobro no encontrado' })
  }

  const c = cobro as unknown as { receipt_path: string | null, driver_payouts: { driver_id: string } }

  if (driverIdEsperado && c.driver_payouts.driver_id !== driverIdEsperado) {
    // 404 y no 403: no se confirma que el cobro exista a quien no le corresponde
    throw createError({ statusCode: 404, message: 'Cobro no encontrado' })
  }

  if (!c.receipt_path) {
    throw createError({ statusCode: 404, message: 'Este cobro no tiene resguardo' })
  }

  const { data: signed, error: signError } = await db.storage
    .from('payout-receipts')
    .createSignedUrl(c.receipt_path, RESGUARDO_VALIDEZ_MINUTOS * 60)

  if (signError || !signed?.signedUrl) {
    throw createError({ statusCode: 500, message: signError?.message || 'No se pudo firmar la descarga' })
  }

  return { url: signed.signedUrl, caducaEnMinutos: RESGUARDO_VALIDEZ_MINUTOS }
}
