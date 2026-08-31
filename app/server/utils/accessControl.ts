/**
 * Reglas de acceso por prefijo de ruta, como funciones puras.
 *
 * Están separadas del middleware y de requireRole a propósito: sin depender de
 * H3 ni de los auto-imports de Nitro se pueden probar con vitest, que es lo que
 * faltaba —el proyecto no tenía ni un test de autorización, y así se colaron 29
 * rutas de taxista sin comprobación de rol—.
 */

/** Roles admitidos en una ruta, o null si la ruta no exige ninguno concreto. */
export function requiredRolesForPath(path: string): string[] | null {
  // Los administradores de este club son también taxistas (tienen ficha en
  // `drivers`), así que necesitan su panel de conductor igual que el resto.
  if (path.startsWith('/api/taxista/')) return ['driver', 'admin']
  if (path.startsWith('/api/admin/')) return ['admin']
  return null
}

/** ¿El rol del usuario está entre los admitidos? Sin rol, nunca. */
export function isRoleAllowed(role: string | undefined | null, allowed: string[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}
