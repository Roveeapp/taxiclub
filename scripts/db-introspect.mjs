import postgres from 'postgres'
import dotenv from 'dotenv'
dotenv.config()

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 })

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `
  console.log('TABLES:', tables.map(t => t.table_name).join(', '))

  for (const t of ['stations', 'accessories', 'system_config', 'route_prices', 'return_offers', 'users', 'drivers']) {
    try {
      const [{ count }] = await sql`SELECT count(*)::int FROM ${sql(t)}`
      console.log(`  ${t}: ${count} rows`)
    } catch (e) {
      console.log(`  ${t}: MISSING (${e.message})`)
    }
  }

  // Check grants for service_role on return_offers
  const grants = await sql`
    SELECT grantee, privilege_type FROM information_schema.role_table_grants
    WHERE table_name = 'return_offers' AND grantee IN ('anon','authenticated','service_role')
  `
  console.log('GRANTS on return_offers:', JSON.stringify(grants))

  // Check users.push_subscription column
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'push_subscription'
  `
  console.log('users.push_subscription exists:', cols.length > 0)
} catch (e) {
  console.error('ERROR:', e.message)
} finally {
  await sql.end()
}
