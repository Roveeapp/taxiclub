export default defineTask({
  meta: { name: 'tasks/remind-unconfirmed', description: 'Remind drivers of unconfirmed bookings' },
  async run() {
    const db = useDb()
    const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: unconfirmed, error } = await db.rpc('get_unconfirmed_assignments', {
      p_threshold: threshold,
    })

    if (error) {
      console.error('Error fetching unconfirmed assignments:', error)
      return { result: { reminders: 0 } }
    }

    for (const assignment of unconfirmed || []) {
      console.log(`Reminder needed for booking ${assignment.booking_id}`)
    }

    return { result: { reminders: unconfirmed?.length || 0 } }
  },
})
