import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!)

async function createAccessories() {
  console.log('Creating accessories table...')

  await sql`
    CREATE TABLE IF NOT EXISTS accessories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS vehicle_accessories (
      vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      accessory_id UUID NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (vehicle_id, accessory_id)
    )
  `

  console.log('Seeding accessories...')

  await sql`
    INSERT INTO accessories (name, icon, description) VALUES
      ('Silla Bebé', 'tabler:armchair', 'Silla de retención infantil'),
      ('Mascotas', 'tabler:paw', 'Se aceptan mascotas'),
      ('Accesible PMR', 'tabler:wheelchair', 'Vehículo adaptado para silla de ruedas'),
      ('Vehículo Grande', 'tabler:car', 'Furgoneta o vehículo de gran capacidad'),
      ('WiFi', 'tabler:wifi', 'Conexión WiFi a bordo'),
      ('Agua', 'tabler:bottle', 'Botella de agua de cortesía'),
      ('Cargador USB', 'tabler:usb', 'Carga USB disponible'),
      ('Pago con Tarjeta', 'tabler:credit-card', 'Datáfono a bordo'),
      ('Espacio Extra Equipaje', 'tabler:luggage', 'Capacidad extra de maletero')
    ON CONFLICT DO NOTHING
  `

  const accessories = await sql`SELECT id, name, icon FROM accessories WHERE is_active = TRUE ORDER BY name`
  console.log('Accessories created:', accessories)

  await sql.end()
}

createAccessories().catch(console.error)
