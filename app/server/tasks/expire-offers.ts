export default defineTask({
  meta: { name: 'tasks/expire-offers', description: 'Expire old return offers' },
  async run() {
    const db = useDb()
    const { data: offers, error } = await db
      .from('return_offers')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('available_until', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('Error expiring offers:', error)
      return { expired: 0 }
    }

    return { expired: offers?.length || 0 }
  },
})
