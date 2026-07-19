export interface PayoutInput {
  gross: number
  isMember: boolean
  isExempt: boolean
  customCommissionPct?: number | null
  customMonthlyFee?: number | null
  config: Record<string, any>
}

/**
 * Cálculo puro de la liquidación mensual (testeado en tests/unit/payouts.spec.ts).
 * Prioridad: valores personalizados del conductor > configuración global.
 */
export function computePayoutBreakdown(input: PayoutInput) {
  const { gross, isMember, isExempt, customCommissionPct, customMonthlyFee, config } = input

  const commissionPct = customCommissionPct !== null && customCommissionPct !== undefined
    ? Number(customCommissionPct)
    : isMember
      ? Number(config.commission_member_pct || 10)
      : Number(config.commission_non_member_pct || 12)

  const commissionAmt = Math.round(gross * commissionPct) / 100
  const net = Math.round((gross - commissionAmt) * 100) / 100

  const membershipFee = (isMember && !isExempt)
    ? (customMonthlyFee !== null && customMonthlyFee !== undefined
        ? Number(customMonthlyFee)
        : Number(config.membership_monthly_fee || 20))
    : 0

  const finalPayout = Math.round((net - membershipFee) * 100) / 100

  return { commissionPct, commissionAmt, net, membershipFee, finalPayout }
}

export async function calculateMonthlyPayout(driverId: string, month: Date) {
  const db = useDb()
  const config = await getSystemConfig()

  const { data: driver, error } = await (db.rpc as any)('get_driver_payout_data', {
    p_driver_id: driverId,
  })

  if (error || !driver || (driver as any[]).length === 0) {
    throw new Error('Driver not found')
  }

  const d = driver[0] as any

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)

  const { data: trips } = await (db.rpc as any)('get_trips_for_payout', {
    p_driver_id: driverId,
    p_month_start: monthStart.toISOString(),
    p_month_end: monthEnd.toISOString(),
  })

  const gross = (trips || []).reduce((sum: number, t: any) => sum + Number(t.total_price), 0)

  const { commissionPct, commissionAmt, net, membershipFee, finalPayout } = computePayoutBreakdown({
    gross,
    isMember: !!d.is_member,
    isExempt: !!d.is_exempt,
    customCommissionPct: d.custom_commission_pct,
    customMonthlyFee: d.custom_monthly_fee,
    config,
  })

  return {
    driverId,
    driverName: d.full_name,
    periodStart: monthStart,
    periodEnd: monthEnd,
    gross,
    commissionPct,
    commissionAmt,
    net,
    membershipFee,
    finalPayout,
  }
}
