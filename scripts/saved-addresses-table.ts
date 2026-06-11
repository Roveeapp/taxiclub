import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!)

async function createSavedAddresses() {
  await sql`
    CREATE TABLE IF NOT EXISTS saved_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      address TEXT NOT NULL,
      lat DECIMAL(9,6),
      lng DECIMAL(9,6),
      is_favorite BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  console.log('saved_addresses table ready')
  await sql.end()
}

createSavedAddresses().catch(console.error)
