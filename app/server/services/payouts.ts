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

  const commissionPct = d.is_member
    ? Number(config.commission_member_pct || 10)
    : Number(config.commission_non_member_pct || 12)

  const commissionAmt = gross * commissionPct / 100
  const net = gross - commissionAmt

  const membershipFee = (d.is_member && !d.is_exempt)
    ? Number(config.membership_monthly_fee || 20)
    : 0

  const finalPayout = net - membershipFee

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
