interface TimeSlot { from: string, to: string }

interface AvailabilityBody {
  date?: string
  dateFrom?: string
  dateTo?: string
  isAvailable: boolean
  timeSlots?: TimeSlot[]
  // Formato antiguo (compatibilidad)
  hourFrom?: string
  hourTo?: string
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_BATCH_DAYS = 92 // ~3 meses

function validateSlots(slots?: TimeSlot[]): TimeSlot[] | null {
  if (!slots || !Array.isArray(slots) || slots.length === 0) return null
  if (slots.length > 6) {
    throw createError({ statusCode: 400, message: 'Máximo 6 franjas por día' })
  }
  const clean: TimeSlot[] = []
  for (const s of slots) {
    const from = String(s?.from || '')
    const to = String(s?.to || '')
    if (!TIME_RE.test(from) || !TIME_RE.test(to)) {
      throw createError({ statusCode: 400, message: 'Formato de hora no válido (usa HH:MM)' })
    }
    if (from >= to) {
      throw createError({ statusCode: 400, message: `La franja ${from}–${to} no es válida: la hora de inicio debe ser anterior a la de fin` })
    }
    clean.push({ from, to })
  }
  return clean.sort((a, b) => a.from.localeCompare(b.from))
}

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody<AvailabilityBody>(event)
  const db = useDb()

  // Franjas nuevas, o migrar formato antiguo hourFrom/hourTo
  let timeSlots = validateSlots(body.timeSlots)
  if (!timeSlots && body.hourFrom && body.hourTo) {
    timeSlots = validateSlots([{ from: body.hourFrom, to: body.hourTo }])
  }

  const row = (date: string) => ({
    driver_id: user.id,
    date,
    is_available: body.isAvailable !== false,
    time_slots: body.isAvailable === false ? null : timeSlots,
    hour_from: null,
    hour_to: null,
  })

  if (body.dateFrom && body.dateTo) {
    const start = new Date(`${body.dateFrom}T00:00:00`)
    const end = new Date(`${body.dateTo}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw createError({ statusCode: 400, message: 'Rango de fechas no válido' })
    }
    if ((end.getTime() - start.getTime()) / 86400000 > MAX_BATCH_DAYS) {
      throw createError({ statusCode: 400, message: `El rango no puede superar ${MAX_BATCH_DAYS} días` })
    }

    const upserts: ReturnType<typeof row>[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      upserts.push(row(d.toISOString().split('T')[0] ?? ''))
    }

    const { error } = await (db.from('driver_availability') as any).upsert(upserts, {
      onConflict: 'driver_id,date',
    })
    if (error) throw createError({ statusCode: 500, message: error.message })

    return { success: true, days: upserts.length }
  }

  if (body.date) {
    const { error } = await (db.from('driver_availability') as any).upsert(
      row(body.date),
      { onConflict: 'driver_id,date' },
    )
    if (error) throw createError({ statusCode: 500, message: error.message })

    return { success: true, days: 1 }
  }

  throw createError({ statusCode: 400, message: 'Falta date o dateFrom/dateTo' })
})
