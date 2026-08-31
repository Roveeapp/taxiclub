import { INTEGRATION_KEYS, invalidateIntegrationCache, loadIntegrationCache } from '../../../utils/integrations'
import type { IntegrationKey } from '../../../utils/integrations'

/**
 * Guarda claves de integraciones. Solo se tocan las claves enviadas:
 *   valor string no vacío → se guarda
 *   null                  → se elimina (vuelve al .env si existe)
 * Los campos ausentes o vacíos no se modifican.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readValidated(event, integracionesSchema)
  const db = useDb()

  let changes = 0
  for (const key of INTEGRATION_KEYS) {
    if (!(key in (body || {}))) continue
    const raw = body[key as IntegrationKey]

    if (raw === null) {
      const { error } = await db.from('integration_settings').delete().eq('key', key)
      if (error) throw createError({ statusCode: 500, message: error.message })
      changes++
      continue
    }

    const value = String(raw ?? '').trim()
    if (!value) continue // vacío = no tocar (los secretos se muestran enmascarados)

    const { error } = await writeTable('integration_settings').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    if (error) throw createError({ statusCode: 500, message: error.message })
    changes++
  }

  invalidateIntegrationCache()
  await loadIntegrationCache(true)

  return { success: true, changes }
})
