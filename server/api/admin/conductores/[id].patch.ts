export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = useDb()

  if (body.isMember !== undefined) {
    await db.execute`
      UPDATE drivers SET is_member = ${body.isMember}, updated_at = NOW() WHERE id = ${id}
    `
  }
  if (body.isExempt !== undefined) {
    await db.execute`
      UPDATE drivers SET is_exempt = ${body.isExempt} WHERE id = ${id}
    `
  }
  if (body.isActive !== undefined) {
    await db.execute`
      UPDATE drivers SET is_active = ${body.isActive} WHERE id = ${id}
    `
  }

  return { success: true }
})
