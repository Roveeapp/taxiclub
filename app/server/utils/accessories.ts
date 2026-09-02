export interface AccessoryFlags {
  needsChildSeat: boolean
  needsPetFriendly: boolean
  needsAccessible: boolean
  needsLargeVehicle: boolean
}

/**
 * Resuelve los IDs de accesorios seleccionados por el cliente a los
 * flags booleanos que usa la tabla `bookings` y el matching de vehículos.
 * El resto de accesorios (WiFi, agua, etc.) son informativos y no afectan.
 */
export async function resolveAccessoryFlags(accessoryIds?: string[]): Promise<AccessoryFlags> {
  const flags: AccessoryFlags = {
    needsChildSeat: false,
    needsPetFriendly: false,
    needsAccessible: false,
    needsLargeVehicle: false,
  }

  if (!accessoryIds || accessoryIds.length === 0) return flags

  const db = useDb()
  // El comentario decía «select('*') para tolerar que la columna `slug` aún no
  // exista (migración 015)». La columna existe desde entonces y los nueve
  // accesorios la tienen rellena, así que ese `*` ya no toleraba nada. Es el
  // mismo patrón que los tres catch de pricing.ts: una defensa contra una
  // migración que llegó hace muchas versiones.
  const { data } = await db
    .from('accessories')
    .select('id, name, slug')
    .in('id', accessoryIds)

  for (const acc of (data || []) as Array<{ id: string, name: string, slug?: string | null }>) {
    const key = (acc.slug || acc.name || '').toLowerCase()
    if (key.includes('child_seat') || key.includes('silla')) flags.needsChildSeat = true
    else if (key.includes('pet') || key.includes('mascota')) flags.needsPetFriendly = true
    else if (key.includes('accessible') || key.includes('pmr') || key.includes('accesible')) flags.needsAccessible = true
    else if (key.includes('large_vehicle') || key.includes('grande')) flags.needsLargeVehicle = true
  }

  return flags
}
