export default defineEventHandler(async () => {
  const config = await getSystemConfig()
  return config
})
