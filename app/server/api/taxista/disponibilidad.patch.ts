export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const sql = useSql()

  if (body.dateFrom && body.dateTo) {
    const start = new Date(body.dateFrom)
    const end = new Date(body.dateTo)
    const dates: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }

    for (const date of dates) {
      await sql`
        INSERT INTO driver_availability (driver_id, date, is_available, hour_from, hour_to)
        VALUES (${user.id}, ${date}, ${body.isAvailable}, ${body.hourFrom || null}, ${body.hourTo || null})
        ON CONFLICT (driver_id, date) DO UPDATE SET
          is_available = ${body.isAvailable},
          hour_from = ${body.hourFrom || null},
          hour_to = ${body.hourTo || null}
      `
    }
  } else if (body.date) {
    await sql`
      INSERT INTO driver_availability (driver_id, date, is_available, hour_from, hour_to)
      VALUES (${user.id}, ${body.date}, ${body.isAvailable}, ${body.hourFrom || null}, ${body.hourTo || null})
      ON CONFLICT (driver_id, date) DO UPDATE SET
        is_available = ${body.isAvailable},
        hour_from = ${body.hourFrom || null},
        hour_to = ${body.hourTo || null}
    `
  }

  return { success: true }
})
