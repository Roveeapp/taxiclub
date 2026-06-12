export default defineTask({
  meta: { name: 'tasks/expire-offers', description: 'Expire old return offers' },
  async run() {
    const db = useDb()
    const { data: offers, error } = await (db
      .from('return_offers') as any)
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('available_until', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('Error expiring offers:', error)
      return { result: { expired: 0 } }
    }

    return { result: { expired: offers?.length || 0 } }
  },
})
