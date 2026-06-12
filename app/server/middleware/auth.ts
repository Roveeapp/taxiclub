export default defineEventHandler(async (event) => {
  const token =
    getCookie(event, 'sb-access-token') ||
    getHeader(event, 'authorization')?.replace('Bearer ', '')

  if (!token) return

  try {
    const supabase = useDb()
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
