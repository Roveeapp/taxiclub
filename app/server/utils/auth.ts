import type { H3Event } from 'h3'

export function requireAuth(event: H3Event) {
  if (!event.context.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return event.context.user
}

export function requireRole(event: H3Event, role: string) {
  requireAuth(event)
  if (event.context.role !== role) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return event.context.user
}

/**
 * Exige que el usuario tenga uno de los roles indicados.
 *
 * Hace falta porque en este club los administradores son además taxistas
 * (los 2 admins tienen ficha en `drivers`), así que un requireRole('driver')
 * estricto sobre /api/taxista/* los dejaría fuera de su propio panel.
 */
export function requireAnyRole(event: H3Event, roles: string[]) {
  requireAuth(event)
  if (!isRoleAllowed(event.context.role as string | undefined, roles)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return event.context.user
}
