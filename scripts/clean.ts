import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!)

async function clean() {
  // Unificar Avilés: mantener "Avilés — RENFE" (33333333...)
  const avilesKeep = '33333333-3333-3333-3333-333333333333'
  const avilesOld = '6f073749-139b-473a-9607-edb23da47001'
  
  await sql`UPDATE route_prices SET origin_station_id = ${avilesKeep} WHERE origin_station_id = ${avilesOld}`
  await sql`UPDATE route_prices SET destination_station_id = ${avilesKeep} WHERE destination_station_id = ${avilesOld}`
  await sql`UPDATE driver_stations SET station_id = ${avilesKeep} WHERE station_id = ${avilesOld}`
  await sql`UPDATE bookings SET origin_station_id = ${avilesKeep} WHERE origin_station_id = ${avilesOld}`
  await sql`UPDATE bookings SET destination_station_id = ${avilesKeep} WHERE destination_station_id = ${avilesOld}`
  await sql`UPDATE return_offers SET destination_station_id = ${avilesKeep} WHERE destination_station_id = ${avilesOld}`
  await sql`DELETE FROM stations WHERE id = ${avilesOld}`
  console.log('Unified Avilés')
  
  // Unificar Gijón: mantener "Gijón — FEVE / Cercanías" (44444444...)
  const gijonKeep = '44444444-4444-4444-4444-444444444444'
  const gijonOld = '15ecb5e8-b210-4038-84eb-9cd18338ac0d'
  
  await sql`UPDATE route_prices SET origin_station_id = ${gijonKeep} WHERE origin_station_id = ${gijonOld}`
  await sql`UPDATE route_prices SET destination_station_id = ${gijonKeep} WHERE destination_station_id = ${gijonOld}`
  await sql`UPDATE driver_stations SET station_id = ${gijonKeep} WHERE station_id = ${gijonOld}`
  await sql`UPDATE bookings SET origin_station_id = ${gijonKeep} WHERE origin_station_id = ${gijonOld}`
  await sql`UPDATE bookings SET destination_station_id = ${gijonKeep} WHERE destination_station_id = ${gijonOld}`
  await sql`UPDATE return_offers SET destination_station_id = ${gijonKeep} WHERE destination_station_id = ${gijonOld}`
  await sql`DELETE FROM stations WHERE id = ${gijonOld}`
  console.log('Unified Gijón')
  
  const final = await sql`SELECT id, name, city FROM stations ORDER BY name`
  console.log('\nFinal stations:', final)
  
  await sql.end()
}

clean()
