/**
 * Descarga del resguardo de un cobro, para el taxista dueño de la liquidación.
 *
 * Vive bajo /api/taxista/ y no bajo /api/admin/ porque el middleware de roles
 * reserva ese prefijo al administrador: una ruta de taxista colgada de /admin/
 * sería código inalcanzable.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const payoutId = getRouterParam(event, 'id')
  const cobroId = getRouterParam(event, 'cobroId')
  if (!payoutId || !cobroId) {
    throw createError({ statusCode: 400, message: 'Faltan identificadores' })
  }
  return firmarResguardo(payoutId, cobroId, user.id)
})
