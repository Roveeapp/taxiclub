export default defineTask({
  meta: { name: 'tasks/process-payouts', description: 'Process monthly driver payouts' },
  async run() {
    const db = useDb()
    const drivers = await db.execute`
      SELECT id FROM drivers WHERE is_active = TRUE
    `

    const results = []
    const now = new Date()
    const month = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    for (const driver of drivers) {
      try {
        const payout = await calculateMonthlyPayout(driver.id as string, month)
        results.push(payout)
      } catch (e) {
        console.error(`Error calculating payout for driver ${driver.id}:`, e)
      }
    }

    return { processed: results.length }
  },
})
