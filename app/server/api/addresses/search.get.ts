export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''
  const user = event.context.user

  const results: Array<{
    id: string
    label: string
    description: string
    source: 'saved' | 'osm'
    icon: string
    lat?: number
    lng?: number
  }> = []

  if (user) {
    const db = useDb()

    const { data: saved } = await db
      .from('saved_addresses')
      .select('id, label, address, lat, lng')
      .eq('user_id', user.id)
      .ilike('address', `%${q}%`)
      .order('is_favorite', { ascending: false })
      .limit(3)

    for (const addr of saved || []) {
      results.push({
        id: addr.id as string,
        label: addr.label as string,
        description: addr.address as string,
        source: 'saved',
        icon: addr.label === 'Casa' ? 'tabler:home' : addr.label === 'Trabajo' ? 'tabler:briefcase' : 'tabler:star',
        lat: Number(addr.lat),
        lng: Number(addr.lng),
      })
    }
  }

  if (q.length >= 3 && results.length < 5) {
    const nominatimUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org'

    try {
      const osmResults = await $fetch<Array<{ lat: string; lon: string; display_name: string; address: any }>>(
        `${nominatimUrl}/search`,
        {
          params: { q, format: 'json', limit: 5, countrycodes: 'es', addressdetails: 1 },
          headers: { 'User-Agent': 'ClubTaxisAsturias/1.0' },
        },
      )

      for (const r of osmResults) {
        const parts = r.display_name.split(',')
        results.push({
          id: `osm:${r.lat}:${r.lon}`,
          label: parts.filter((p: string) => p.trim()).slice(0, 2).join(', ').trim(),
          description: parts.filter((p: string) => p.trim()).slice(0, 4).join(', ').trim(),
          source: 'osm',
          icon: 'tabler:map-pin',
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })
      }
    } catch (e) {
      console.error('[Nominatim] Error:', e)
    }
  }

  return results.slice(0, 6)
})
