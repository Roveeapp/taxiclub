export async function getSystemConfig(): Promise<Record<string, any>> {
  const db = useDb()
  const rows = await db.execute`SELECT key, value FROM system_config`
  const config: Record<string, any> = {}
  for (const row of rows) {
    config[row.key as string] = row.value
  }
  return config
}
