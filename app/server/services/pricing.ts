export async function getSystemConfig(): Promise<Record<string, any>> {
  const db = useDb()
  const { data: rows } = await db.from('system_config').select('key, value')
  const config: Record<string, any> = {}
  for (const row of rows || []) {
    config[row.key as string] = row.value
  }
  return config
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const config = useRuntimeConfig()
  const nominatimUrl = config.nominatimUrl || 'https://nominatim.openstreetmap.org'

  try {
    const response = await $fetch<Array<{ lat: string; lon: string }>>(`${nominatimUrl}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'es',
      },
    })

    if (response && response.length > 0) {
      return {
        lat: parseFloat(response[0].lat),
        lng: parseFloat(response[0].lon),
      }
    }
    return null
  } catch (e) {
    console.error('Geocoding error:', e)
    return null
  }
}

export async function calculateDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number> {
  const R = 6371
  const dLat = (destLat - originLat) * Math.PI / 180
  const dLng = (destLng - originLng) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
