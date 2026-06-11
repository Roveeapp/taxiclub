export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const users = await sql`
    SELECT id, email, phone, full_name, role, created_at
    FROM users WHERE id = ${user.id}
  `

  if (users.length === 0) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const userData = users[0] as any

  let driverData = null
  if (userData.role === 'driver') {
    const drivers = await sql`
      SELECT * FROM drivers WHERE id = ${user.id}
    `
    driverData = drivers[0] || null
  }

  return { ...userData, driver: driverData }
})
