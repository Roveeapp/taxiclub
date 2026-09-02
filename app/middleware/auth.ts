/**
 * Guard de rutas del cliente.
 *
 * El rol se pregunta al servidor, no se lee de `user_metadata`. Antes:
 *
 *   const role = user.value.user_metadata?.role
 *
 * y la metadata la escribe el propio usuario. En el cliente eso no abre un
 * agujero —la API rechaza igual— pero sí bloqueaba a los administradores de
 * verdad: uno promovido cambiando `public.users.role`, que es como se hace,
 * tenía metadata de `driver` y este guard lo echaba de `/admin` a la portada,
 * con el servidor respondiéndole 200. Ver composables/useRol.ts.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const rutasProtegidas = ['/taxista', '/admin', '/cuenta']
  if (!rutasProtegidas.some(p => to.path.startsWith(p))) return

  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/cuenta/login')
  }

  // `/cuenta` solo exige sesión, así que no hace falta esperar al rol
  if (!to.path.startsWith('/taxista') && !to.path.startsWith('/admin')) return

  const { asegurar } = useRol()
  const rol = await asegurar()

  // En este club los administradores también conducen, así que entran en el
  // panel de taxista. Es el mismo criterio que el middleware de servidor.
  if (to.path.startsWith('/taxista') && rol !== 'driver' && rol !== 'admin') {
    return navigateTo('/')
  }
  if (to.path.startsWith('/admin') && rol !== 'admin') {
    return navigateTo('/')
  }
})
