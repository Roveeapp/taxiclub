import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!)

async function check() {
  const stations = await sql`SELECT name, city FROM stations`
  console.log('Stations:', stations)
  
  const config = await sql`SELECT key, value FROM system_config`
  console.log('Config:', config)
  
  await sql.end()
}

check()
