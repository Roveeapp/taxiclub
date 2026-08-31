/**
 * Liquidaciones del taxista, con su historial de cobros.
 *
 * Se incluye el historial porque en el modelo del MVP es él quien paga al club:
 * necesita ver qué debe, qué ha pagado ya y con qué justificante, no solo un
 * importe final.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: payouts, error } = await db
    .from('driver_payouts')
    .select(`
      id, period_start, period_end, gross_amount, trip_count,
      commission_pct, commission_amt, membership_fee, net_amount, final_payout,
      direction, amount_due, settled_amount, settlement_status, due_date,
      paid_at, created_at,
      payout_settlements ( id, amount, method, reference, notes, settled_at, receipt_path )
    `)
    .eq('driver_id', user.id)
    .order('period_start', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  interface Cobro { receipt_path?: string | null, settled_at?: string | null, [k: string]: unknown }
  interface Liquidacion { payout_settlements?: Cobro[], [k: string]: unknown }

  // La ruta del resguardo no se expone: se indica si existe, y la descarga pasa
  // por la ruta que firma una URL temporal.
  return ((payouts || []) as Liquidacion[]).map(p => ({
    ...p,
    payout_settlements: (p.payout_settlements || [])
      .map(({ receipt_path, ...cobro }): Cobro => ({ ...cobro, tiene_resguardo: Boolean(receipt_path) }))
      .sort((a, b) => String(b.settled_at ?? '').localeCompare(String(a.settled_at ?? ''))),
  }))
})
