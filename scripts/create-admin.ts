import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import postgres from 'postgres'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const sql = postgres(process.env.DATABASE_URL!)

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'dallaswk@gmail.com'
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    console.error('Define ADMIN_PASSWORD en el entorno antes de ejecutar este script.')
    process.exit(1)
  }

  console.log(`Creating admin user: ${email}`)

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name: 'Administrador',
    },
  })

  if (error) {
    console.error('Error creating user:', error.message)
    await sql.end()
    return
  }

  console.log('User created:', data.user.id)

  await sql`
    INSERT INTO users (id, email, full_name, role)
    VALUES (${data.user.id}, ${email}, 'Administrador', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin'
  `

  console.log('Admin user record inserted in users table')

  const check = await sql`SELECT id, email, role FROM users WHERE email = ${email}`
  console.log('Verified:', check)

  await sql.end()
}

createAdmin()
