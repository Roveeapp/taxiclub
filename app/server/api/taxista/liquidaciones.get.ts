export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: payouts } = await db
    .from('driver_payouts')
    .select('*')
    .eq('driver_id', user.id)
    .order('period_start', { ascending: false })

  return payouts || []
})
