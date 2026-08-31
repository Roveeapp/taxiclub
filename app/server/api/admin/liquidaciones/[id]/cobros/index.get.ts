/** Historial de cobros de una liquidación, del más reciente al más antiguo. */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const payoutId = getRouterParam(event, 'id')
  if (!payoutId) throw createError({ statusCode: 400, message: 'Falta el identificador de la liquidación' })

  const db = useDb()
  const { data, error } = await db
    .from('payout_settlements')
    .select('id, amount, method, reference, receipt_path, notes, settled_at, recorded_by, created_at')
    .eq('payout_id', payoutId)
    .order('settled_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const cobros = (data || []) as Array<Record<string, unknown>>

  // El resguardo no se expone por su ruta: se indica si existe, y se descarga
  // por la ruta de resguardo, que genera una URL firmada y temporal.
  return cobros.map(c => ({
    ...c,
    receipt_path: undefined,
    tiene_resguardo: Boolean(c.receipt_path),
  }))
})
