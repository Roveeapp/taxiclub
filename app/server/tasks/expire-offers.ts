export default defineTask({
  meta: { name: 'tasks/expire-offers', description: 'Expire old return offers' },
  async run() {
    const sql = useSql()
    const offers = await sql`
      UPDATE return_offers
      SET status = 'expired'
      WHERE status = 'active'
        AND available_until < NOW()
      RETURNING id
    `
    return { expired: offers.length }
  },
})
