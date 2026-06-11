export async function calculateMonthlyPayout(driverId: string, month: Date) {
  const sql = useSql()
  const config = await getSystemConfig()

  const driver = await sql`
    SELECT d.*, u.email, u.full_name
    FROM drivers d
    JOIN users u ON u.id = d.id
    WHERE d.id = ${driverId}
  `

  if (driver.length === 0) throw new Error('Driver not found')

  const d = driver[0] as any

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)

  const trips = await sql`
    SELECT total_price FROM bookings b
    JOIN booking_assignments ba ON ba.booking_id = b.id
    WHERE ba.driver_id = ${driverId}
      AND b.status = 'completed'
      AND b.created_at BETWEEN ${monthStart} AND ${monthEnd}
  `

  const gross = trips.reduce((sum: number, t: any) => sum + Number(t.total_price), 0)

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
