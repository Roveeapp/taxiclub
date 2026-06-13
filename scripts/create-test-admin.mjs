import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = 'admin.test@test.com', password = 'Admin1234!'
// delete if exists
const { data: list } = await admin.auth.admin.listUsers()
const existing = list.users.find(u => u.email === email)
if (existing) { await admin.auth.admin.deleteUser(existing.id); console.log('deleted old') }
const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'admin', full_name: 'Admin Test' } })
if (error) { console.error('ERR', error.message); process.exit(1) }
console.log('created admin', data.user.id)
// ensure users table row (trigger should do it, but upsert to be safe)
await admin.from('users').upsert({ id: data.user.id, email, full_name: 'Admin Test', role: 'admin' })
console.log('✓ admin test user ready')
