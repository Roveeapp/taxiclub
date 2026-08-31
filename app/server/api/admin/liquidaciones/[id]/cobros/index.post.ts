/**
 * Registra un movimiento de cobro de una liquidación.
 *
 * El club cobra al taxista por transferencia o por Stripe, y cada cobro queda
 * como asiento en payout_settlements: quién lo registró, cuándo, por qué vía y
 * con qué referencia. El estado de la liquidación lo recalcula un trigger desde
 * la suma de asientos, así que no puede desincronizarse del historial.
 *
 * Un importe negativo registra una devolución o una corrección. No se borran
 * asientos: se rectifica con uno nuevo, que es lo que permite auditar después.
 */
export default defineEventHandler(async (event) => {
  const admin = requireRole(event, 'admin')
  const payoutId = getRouterParam(event, 'id')
  if (!payoutId) throw createError({ statusCode: 400, message: 'Falta el identificador de la liquidación' })

  const body = await readValidated(event, registrarCobroSchema)
  const db = useDb()

  const { data: payout, error: findError } = await db
    .from('driver_payouts')
    .select('id, driver_id, amount_due, direction, settled_amount')
    .eq('id', payoutId)
    .single()

  if (findError || !payout) {
    throw createError({ statusCode: 404, message: 'Liquidación no encontrada' })
  }

  const p = payout as { amount_due: number | null, direction: string | null, settled_amount: number | null }

  if (p.direction !== 'driver_pays_platform') {
    throw createError({
      statusCode: 409,
      message: 'Esta liquidación es a favor del taxista, no un cobro. Regístrala como pago cuando se active esa vía.',
    })
  }

  // Se avisa de un cobro por encima de lo debido, pero no se bloquea: puede ser
  // un adelanto o un ajuste deliberado, y quien lo registra es un admin.
  const due = Number(p.amount_due ?? 0)
  const yaCobrado = Number(p.settled_amount ?? 0)
  if (body.amount > 0 && yaCobrado + body.amount > due + 0.01) {
    console.warn(
      `[Cobros] La liquidación ${payoutId} quedaría sobrecobrada: ` +
      `debido=${due} cobrado=${yaCobrado} nuevo=${body.amount}`,
    )
  }

  const { data: cobro, error } = await writeTable('payout_settlements')
    .insert({
      payout_id: payoutId,
      amount: body.amount,
      method: body.method,
      reference: body.reference || null,
      notes: body.notes || null,
      settled_at: body.settledAt || new Date().toISOString(),
      recorded_by: admin.id,
    })
    .select()
    .single<{ id: string }>()

  if (error || !cobro) {
    throw createError({ statusCode: 500, message: error?.message || 'No se pudo registrar el cobro' })
  }

  // Se devuelve el estado recalculado por el trigger, no el que teníamos
  const { data: actualizada } = await db
    .from('driver_payouts')
    .select('settled_amount, settlement_status, paid_at')
    .eq('id', payoutId)
    .single()

  return { cobro, liquidacion: actualizada }
})
