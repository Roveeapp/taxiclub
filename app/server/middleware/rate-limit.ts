/**
 * Aplica el límite de peticiones por IP. Las reglas y el cálculo de claves
 * viven en utils/rateLimit.ts, donde se pueden testear sin H3.
 */
export default defineEventHandler(async (event) => {
  const rule = rateLimitRuleForRequest(event.method || 'GET', event.path || '')
  if (!rule) return

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'desconocida'
  const now = Date.now()
  const key = rateLimitKey(rule, ip, now)

  const storage = useStorage('cache')
  const previo = Number((await storage.getItem<number>(key)) ?? 0)
  const actual = previo + 1

  // El TTL evita que las ventanas viejas se acumulen en el almacenamiento
  await storage.setItem(key, actual, { ttl: rule.windowSeconds + 60 })

  const restantes = Math.max(0, rule.limit - actual)
  setHeader(event, 'X-RateLimit-Limit', String(rule.limit))
  setHeader(event, 'X-RateLimit-Remaining', String(restantes))

  if (actual > rule.limit) {
    const espera = secondsUntilReset(rule, now)
    setHeader(event, 'Retry-After', String(espera))
    console.warn(`[RateLimit] ${ip} superó el límite de ${rule.bucket} (${actual}/${rule.limit})`)
    throw createError({
      statusCode: 429,
      message: `Demasiadas peticiones. Vuelve a intentarlo en ${Math.ceil(espera / 60)} min.`,
    })
  }
})
