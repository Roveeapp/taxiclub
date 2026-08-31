/**
 * Genera las liquidaciones del mes anterior para todos los conductores activos.
 *
 * Antes calculaba y NO guardaba nada: devolvía los importes y se perdían al
 * recargar. Es la razón por la que `driver_payouts` estaba vacía pese a que el
 * panel tiene un botón de «Procesar liquidaciones».
 *
 * También recorría los conductores con un await dentro del bucle: con 50
 * conductores, 50 viajes secuenciales a la base de datos. Ahora van en paralelo.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')

  const drivers = await $fetch<Array<{ id: string, is_active: boolean, full_name?: string }>>(
    '/api/admin/conductores',
    { headers: event.headers },
  )

  const activeDrivers = drivers.filter(d => d.is_active)
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const calculos = await Promise.all(
    activeDrivers.map(async (driver) => {
      try {
        return { ok: true as const, payout: await calculateMonthlyPayout(driver.id, month) }
      } catch (e) {
        console.error(`[Liquidaciones] No se pudo calcular la de ${driver.id}:`, e)
        return { ok: false as const, driverId: driver.id, motivo: (e as Error)?.message }
      }
    }),
  )

  const payouts = calculos.filter(r => r.ok).map(r => r.payout)
  const fallidos = calculos.filter(r => !r.ok).map(r => ({ driverId: r.driverId, motivo: r.motivo }))

  // Se persisten para que queden como registro contable. El índice único por
  // (driver_id, period_start) evita liquidar dos veces el mismo mes: si ya
  // existe, se actualiza en lugar de duplicar.
  let guardadas = 0
  if (payouts.length > 0) {
    const filas = payouts.map(p => ({
      driver_id: p.driverId,
      period_start: p.periodStart.toISOString().slice(0, 10),
      period_end: p.periodEnd.toISOString().slice(0, 10),
      gross_amount: p.gross,
      commission_pct: p.commissionPct,
      commission_amt: p.commissionAmt,
      net_amount: p.net,
      membership_fee: p.membershipFee,
      final_payout: p.finalPayout,
      direction: p.direction,
      amount_due: p.amountDue,
      trip_count: p.tripCount,
    }))

    const { error } = await useDb()
      .from('driver_payouts')
      .upsert(filas as never, { onConflict: 'driver_id,period_start' })

    if (error) {
      throw createError({
        statusCode: 500,
        message: `Se calcularon las liquidaciones pero no se pudieron guardar: ${error.message}`,
      })
    }
    guardadas = filas.length
  }

  const aCobrar = payouts.filter(p => p.direction === 'driver_pays_platform')
  const aPagar = payouts.filter(p => p.direction === 'platform_pays_driver' && p.amountDue > 0)

  return {
    processed: payouts.length,
    guardadas,
    fallidos,
    resumen: {
      totalACobrarDeTaxistas: Math.round(aCobrar.reduce((s, p) => s + p.amountDue, 0) * 100) / 100,
      totalAPagarATaxistas: Math.round(aPagar.reduce((s, p) => s + p.amountDue, 0) * 100) / 100,
    },
    payouts,
  }
})
