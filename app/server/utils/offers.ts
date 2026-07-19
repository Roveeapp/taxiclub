let lastRun = 0
const MIN_INTERVAL_MS = 30 * 1000

/**
 * Marca como 'expired' las ofertas activas cuya hora "hasta" ya pasó.
 * Se llama al consultar ofertas (expiración perezosa) como refuerzo
 * del cron en base de datos (migración 030). Se auto-limita para no
 * ejecutar el UPDATE en cada petición.
 */
export async function expireStaleOffers(force = false): Promise<void> {
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return
  lastRun = Date.now()

  try {
    const db = useDb()
    await (db.from('return_offers') as any)
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('available_until', new Date().toISOString())
  } catch (e) {
    console.error('[Offers] Error expirando ofertas:', e)
  }
}
