/** Descarga del resguardo de un cobro, para el administrador. */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const payoutId = getRouterParam(event, 'id')
  const cobroId = getRouterParam(event, 'cobroId')
  if (!payoutId || !cobroId) {
    throw createError({ statusCode: 400, message: 'Faltan identificadores' })
  }
  return firmarResguardo(payoutId, cobroId)
})
