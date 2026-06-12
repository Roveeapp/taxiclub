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
