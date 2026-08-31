/**
 * Control de acceso por prefijo de ruta.
 *
 * Las 29 rutas de /api/taxista/ usaban solo requireAuth(), así que cualquier
 * cliente registrado podía publicar ofertas, crear vehículos o fijarse su
 * tarifa por km. Aplicarlo aquí en lugar de ruta por ruta significa que una
 * ruta nueva no puede olvidarse de comprobarlo.
 *
 * Se ejecuta después de middleware/auth.ts (orden alfabético: auth <
 * role-guard), que es quien rellena event.context.user y event.context.role.
 * Las reglas viven en utils/accessControl.ts, donde se pueden testear.
 */
export default defineEventHandler((event) => {
  const roles = requiredRolesForPath(event.path || '')
  if (!roles) return

  if (!event.context.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  if (!isRoleAllowed(event.context.role as string | undefined, roles)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
})
