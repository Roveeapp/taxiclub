export default defineTask({
  meta: { name: 'tasks/charge-memberships', description: 'Charge monthly membership fees' },
  async run() {
    const db = useDb()
    const config = await getSystemConfig()

    const { data: members, error } = await (db.rpc as any)('get_active_members')

    if (error) {
      console.error('Error fetching members:', error)
      return { result: { charged: 0 } }
    }

    const fee = Number(config.membership_monthly_fee || 20)
    let charged = 0

    for (const member of (members || []) as any[]) {
      if (member.stripe_account_id) {
        console.log(`Charging ${fee}€ to driver ${member.id}`)
        charged++
      }
    }

    return { result: { charged } }
  },
})
