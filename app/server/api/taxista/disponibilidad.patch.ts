export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  if (body.dateFrom && body.dateTo) {
    const start = new Date(body.dateFrom)
    const end = new Date(body.dateTo)
    const dates: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0] ?? '')
    }

    const upserts = dates.map((date) => ({
      driver_id: user.id,
      date,
      is_available: body.isAvailable,
      hour_from: body.hourFrom || null,
      hour_to: body.hourTo || null,
    }))

    const { error } = await (db.from('driver_availability') as any).upsert(upserts, {
      onConflict: 'driver_id,date',
    })

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }
  } else if (body.date) {
    const { error } = await (db.from('driver_availability') as any).upsert(
      {
        driver_id: user.id,
        date: body.date,
        is_available: body.isAvailable,
        hour_from: body.hourFrom || null,
        hour_to: body.hourTo || null,
      },
      { onConflict: 'driver_id,date' },
    )

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }
  }

  return { success: true }
})
