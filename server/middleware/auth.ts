export default defineEventHandler(async (event) => {
  const token =
    getCookie(event, 'sb-access-token') ||
    getHeader(event, 'authorization')?.replace('Bearer ', '')

  if (!token) return

  try {
    const supabase = useSupabaseAdmin()
    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    if (user) {
      event.context.user = user
      event.context.role = user.user_metadata?.role
    }
  } catch {
    // Token inválido, continuar sin auth
  }
})

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
