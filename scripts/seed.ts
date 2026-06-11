import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!)

async function seed() {
  console.log('Seeding stations...')
  
  await sql`
    INSERT INTO stations (name, city, address, lat, lng) VALUES
      ('Aeropuerto de Asturias', 'Castrillón', 'AS-19, 33459 Castrillón', 43.5584, -6.0340),
      ('Pravia', 'Pravia', 'Calle Mayor, Pravia', 43.4986, -6.1086),
      ('Avilés (RENFE)', 'Avilés', 'Pl. de la Estación, Avilés', 43.5537, -5.9232),
      ('Gijón (FEVE)', 'Gijón', 'Calle Sanz Crespo, Gijón', 43.5321, -5.6636)
    ON CONFLICT DO NOTHING
  `
  
  console.log('Seeding system config...')
  
  await sql`
    INSERT INTO system_config (key, value) VALUES
      ('min_advance_hours', '2'::jsonb),
      ('commission_member_pct', '10'::jsonb),
      ('commission_non_member_pct', '12'::jsonb),
      ('membership_monthly_fee', '20.00'::jsonb),
      ('max_cancel_hours_before', '24'::jsonb)
    ON CONFLICT DO NOTHING
  `
  
  console.log('Seed completed!')
  await sql.end()
}

seed().catch(console.error)
