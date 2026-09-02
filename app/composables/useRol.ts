/**
 * El rol del usuario, según el servidor.
 *
 * POR QUÉ NO SE LEE DE `user_metadata`
 *   El cliente lo leía de ahí en cuatro sitios: el guard de rutas, el store de
 *   auth, el redirect posterior al login y el enlace «ir a mi panel». Y la
 *   metadata la escribe el propio usuario, así que era la misma fuente que se
 *   retiró del middleware de servidor en 6d48831.
 *
 *   En el cliente no es un agujero de seguridad —la API rechaza igual—, pero sí
 *   un bloqueo real: un administrador promovido cambiando `public.users.role`,
 *   que es como se hace, tenía metadata de `driver` y el guard lo echaba de
 *   `/admin` a la portada. El servidor le respondía 200 y el navegador lo
 *   sacaba. Lo descubrí montando el tema claro: no conseguía abrir el panel de
 *   admin para comprobarlo.
 *
 *   Y al revés: alguien que se pusiera `role: 'admin'` en su propia metadata
 *   veía el panel entero cargar, aunque cada llamada devolviera 403. Un panel
 *   lleno de errores es peor que una redirección.
 *
 * `GET /api/auth/me` lee `public.users`, que solo se escribe con la clave de
 * servicio. Se guarda en `useState`, así que la consulta se hace una vez por
 * carga de página y se comparte entre servidor y cliente.
 */
export type Rol = 'client' | 'driver' | 'admin'

export function useRol() {
  const rol = useState<Rol | null>('rol-usuario', () => null)
  const cargado = useState<boolean>('rol-cargado', () => false)

  /** Lo pide al servidor si no se sabe todavía. */
  async function asegurar(): Promise<Rol | null> {
    if (cargado.value) return rol.value
    const user = useSupabaseUser()
    if (!user.value) {
      cargado.value = true
      rol.value = null
      return null
    }
    try {
      // `useRequestFetch()` y no `$fetch`: en el renderizado en servidor, $fetch
      // NO reenvía la cookie de sesión, así que /api/auth/me respondía sin
      // sesión, el rol quedaba a null y este guard echaba a TODO EL MUNDO de
      // los dos paneles. Lo vi porque la comprobación en navegador dejó de
      // encontrar el layout de panel en ninguna ruta.
      const peticion = useRequestFetch()
      const me = await peticion<{ role?: string }>('/api/auth/me')
      rol.value = (me?.role as Rol) ?? null
    } catch {
      // Sin respuesta no se inventa un rol: sin rol, el guard no deja pasar a
      // las rutas protegidas, que es el lado seguro del error.
      rol.value = null
    }
    cargado.value = true
    return rol.value
  }

  /** Se llama al entrar y al salir, para que el siguiente lo vuelva a pedir. */
  function olvidar() {
    rol.value = null
    cargado.value = false
  }

  return { rol, asegurar, olvidar }
}
