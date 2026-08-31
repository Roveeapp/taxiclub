/**
 * Salud de las tareas programadas.
 *
 * Existe porque `cron.job_run_details` miente por omisión: marca `succeeded`
 * mientras el SQL se ejecute, aunque la llamada HTTP devuelva 404 o 401. Las
 * cuatro tareas de este proyecto llevaban meses fallando con el historial de
 * cron en verde, y el 404 solo aparecía en `net._http_response`, que nadie
 * mira.
 *
 * `cron_task_status` cruza ambas cosas por el request_id que ahora capturan las
 * tareas, así que aquí el desenlace es el real.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data: estado, error } = await db
    .from('cron_task_status')
    .select('*')
    .order('jobname')

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const tareas = (estado || []) as Array<{
    jobname: string
    active: boolean | null
    last_outcome: string | null
    fallos_ultimas_24h: number | null
  }>

  // Se resume para que el panel pueda mostrar un aviso sin interpretar nada
  const conProblemas = tareas.filter(
    t => t.active && t.last_outcome !== 'ok',
  )

  return {
    tareas,
    hayProblemas: conProblemas.length > 0,
    problemas: conProblemas.map(t => ({
      jobname: t.jobname,
      motivo: t.last_outcome,
      fallos24h: t.fallos_ultimas_24h,
    })),
  }
})
