export default defineTask({
  meta: { name: 'tasks/remind-unconfirmed', description: 'Remind drivers of unconfirmed bookings' },
  async run() {
    const sql = useSql()
    const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const unconfirmed = await sql`
      SELECT ba.id, ba.driver_id, b.id as booking_id
      FROM booking_assignments ba
      JOIN bookings b ON b.id = ba.booking_id
      WHERE b.status = 'pending'
        AND ba.confirmed_at IS NULL
        AND ba.assigned_at < ${threshold}::timestamptz
    `

    for (const assignment of unconfirmed) {
      console.log(`Reminder needed for booking ${assignment.booking_id}`)
    }

    return { reminders: unconfirmed.length }
  },
})
