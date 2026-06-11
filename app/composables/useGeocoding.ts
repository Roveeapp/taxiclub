export interface GeocodingResult {
  lat: number
  lon: number
  display_name: string
  address?: {
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

export function useGeocoding() {
  const config = useRuntimeConfig()
  const nominatimUrl = config.nominatimUrl || 'https://nominatim.openstreetmap.org'

  async function search(query: string, limit = 5): Promise<GeocodingResult[]> {
    if (!query || query.length < 3) return []

    try {
      const response = await $fetch<GeocodingResult[]>(`${nominatimUrl}/search`, {
        params: {
          q: query,
          format: 'json',
          limit,
          addressdetails: 1,
          countrycodes: 'es',
        },
      })
      return response || []
    } catch (e) {
      console.error('Geocoding error:', e)
      return []
    }
  }

  async function reverse(lat: number, lon: number): Promise<GeocodingResult | null> {
    try {
      const response = await $fetch<GeocodingResult>(`${nominatimUrl}/reverse`, {
        params: {
          lat,
          lon,
          format: 'json',
          addressdetails: 1,
        },
      })
      return response || null
    } catch (e) {
      console.error('Reverse geocoding error:', e)
      return null
    }
  }

  return { search, reverse }
}
