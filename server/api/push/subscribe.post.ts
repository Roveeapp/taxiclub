export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  await db.execute`
    UPDATE users SET push_subscription = ${JSON.stringify(body.subscription)}
    WHERE id = ${user.id}
  `

  return { success: true }
})
