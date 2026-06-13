import postgres from 'postgres'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config()
const file = process.argv[2]
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 })
try {
  const content = readFileSync(file, 'utf8')
  await sql.unsafe(content)
  console.log(`✓ Applied ${file}`)
} catch (e) {
  console.error(`✗ ERROR applying ${file}:`, e.message)
  process.exit(1)
} finally {
  await sql.end()
}
