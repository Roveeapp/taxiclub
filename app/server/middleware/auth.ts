import { serverSupabaseUser } from '#supabase/server'

/**
 * Resuelve la sesión y el rol de cada petición.
 *
 * EL ROL SE LEE DE LA TABLA, SIEMPRE
 *   El código anterior hacía lo contrario de lo que decía su propio comentario:
 *
 *     let role = user.user_metadata?.role       // ← esto mandaba
 *     if (!role) { ...consultar la tabla... }   // ← y esto casi nunca corría
 *
 *   El comentario afirmaba que la tabla era la fuente de verdad y que la
 *   metadata era «solo una caché». En la práctica la metadata ganaba siempre,
 *   porque el alta la rellena.
 *
 *   Y la metadata la escribe el propio usuario. El alta real de la aplicación
 *   no pasa por /api/auth/register —nada llama a esa ruta—: la hace el
 *   navegador con `supabase.auth.signUp({ options: { data: { role } } })` desde
 *   pages/cuenta/login.vue. Cualquiera puede además cambiarla después con
 *   `supabase.auth.updateUser({ data: { role: 'admin' } })`, que Supabase
 *   permite sobre la cuenta propia por diseño.
 *
 *   Comprobado en la base de datos: insertando en auth.users la misma metadata
 *   que pone el navegador, `public.users.role` quedaba en `admin`.
 *
 *   Así que endurecer el enum de /api/auth/register cerró una puerta que no se
 *   usaba. La que se usa es esta, y ahora el rol sale de `public.users`, que
 *   solo se puede cambiar con la clave de servicio.
 *
 *   Cuesta una consulta por petición autenticada: es una búsqueda por clave
 *   primaria, y es el precio de que el rol no lo decida el cliente.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) return

    event.context.user = user

    const db = useDb()
    const { data, error } = await db
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      // Sin rol no se entra en ninguna ruta protegida: `requireRole` rechazará.
      // Es preferible a caer a la metadata, que es lo que el cliente controla.
      console.error(`[Auth] No se pudo leer el rol de ${user.id}:`, error.message)
      return
    }

    event.context.role = (data as { role?: string } | null)?.role
  } catch {
    // Sin sesión o token inválido — continúa sin contexto de auth
  }
})
