import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) return

    event.context.user = user

    // El rol vive en la tabla `users` (fuente de verdad). El user_metadata
    // de Supabase Auth es solo una caché que puede estar desincronizada,
    // así que resolvemos el rol consultando la tabla y caemos a la metadata.
    let role = user.user_metadata?.role as string | undefined
    if (!role) {
      const db = useDb()
      const { data } = await db
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      role = (data as { role?: string } | null)?.role
    }
    event.context.role = role
  } catch {
    // Sin sesión o token inválido — continúa sin contexto de auth
  }
})
