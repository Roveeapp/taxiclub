export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const config = await getSystemConfig()

  return config
})
