export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')

  const drivers = await $fetch('/api/admin/conductores', {
    headers: event.headers,
  })

  const activeDrivers = (drivers as any[]).filter((d: any) => d.is_active)
  const results = []
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  for (const driver of activeDrivers) {
    try {
      const payout = await calculateMonthlyPayout(driver.id, month)
      results.push(payout)
    } catch (e) {
      console.error(`Error calculating payout for driver ${driver.id}:`, e)
    }
  }

  return { processed: results.length, payouts: results }
})
