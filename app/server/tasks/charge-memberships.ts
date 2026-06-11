export default defineTask({
  meta: { name: 'tasks/charge-memberships', description: 'Charge monthly membership fees' },
  async run() {
    const sql = useSql()
    const config = await getSystemConfig()

    const members = await sql`
      SELECT d.id, d.stripe_account_id, u.email
      FROM drivers d
      JOIN users u ON u.id = d.id
      WHERE d.is_member = TRUE
        AND d.is_exempt = FALSE
        AND d.is_active = TRUE
    `

    const fee = Number(config.membership_monthly_fee || 20)
    let charged = 0

    for (const member of members) {
      if (member.stripe_account_id) {
        console.log(`Charging ${fee}€ to driver ${member.id}`)
        charged++
      }
    }

    return { charged }
  },
})
