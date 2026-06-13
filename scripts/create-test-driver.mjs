import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import dotenv from 'dotenv'

dotenv.config()

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.DATABASE_URL

if (!url || !serviceRoleKey || !dbUrl) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const sql = postgres(dbUrl, { prepare: false, max: 1 })

async function createTestDriver() {
  const email = 'ivan.menendez@test.com'
  const password = 'Test1234!'
  const fullName = 'Iván Menéndez'
  const phone = '+34600123456'

  // 1. Check if user exists
  const existing = await sql`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`
  let userId
  if (existing.length > 0) {
    userId = existing[0].id
    console.log('User already exists:', userId)
  } else {
    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) {
      console.error('Auth error:', authError)
      await sql.end()
      process.exit(1)
    }
    userId = authData.user.id
    console.log('Auth user created:', userId)

    // 3. Create user record via raw SQL
    await sql`
      INSERT INTO users (id, email, phone, full_name, role)
      VALUES (${userId}, ${email}, ${phone}, ${fullName}, 'driver')
    `
  }

  // 4. Create driver record (skip if exists)
  const existingDriver = await sql`SELECT id FROM drivers WHERE id = ${userId} LIMIT 1`
  if (existingDriver.length === 0) {
    await sql`
      INSERT INTO drivers (id, license_number, license_city, is_active, is_member)
      VALUES (${userId}, 'LIC-IVAN-2024', 'Pravia', true, false)
    `
    console.log('Driver record created')
  } else {
    console.log('Driver record already exists')
  }

  // 5. Get station IDs
  const stations = await sql`
    SELECT id, name FROM stations
    WHERE name IN ('Pravia', 'Aeropuerto de Asturias')
  `

  if (stations.length !== 2) {
    console.error('Could not find stations')
    await sql.end()
    process.exit(1)
  }

  console.log('Stations found:', stations.map(s => s.name).join(', '))

  // 6. Assign stations
  for (const s of stations) {
    try {
      await sql`
        INSERT INTO driver_stations (driver_id, station_id, is_active)
        VALUES (${userId}, ${s.id}, true)
      `
    } catch (e) {
      if (e.code === '23505') {
        console.log(`  Station ${s.name} already assigned, skipping`)
      } else {
        throw e
      }
    }
  }

  await sql.end()

  console.log('✅ Test driver created successfully!')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('Stations:', stations.map(s => s.name).join(', '))
}

createTestDriver().catch(console.error)
